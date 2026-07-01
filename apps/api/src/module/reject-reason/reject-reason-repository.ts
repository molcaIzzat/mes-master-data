import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";
import type {
  CreateRejectReason,
  RejectReason,
  ListRejectReasonInput,
  PagedRejectReason,
  UpdateRejectReason,
} from "./reject-reason.js";
import {
  rejectReasonAreaTable,
  rejectReasonLineTable,
  rejectReasonMachineTable,
  rejectReasonTable,
} from "../../shared/database/schema/schema.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { DuplicateRejectReasonError } from "./reject-reason-errors.js";

type RejectReasonReaderDeps = {
  db: PostgresDB;
  region: string;
};

type RejectReasonWriterDeps = {
  db: PostgresDB;
  region: string;
};

type RejectReasonReader = {
  findAll: (input: ListRejectReasonInput) => Promise<PagedRejectReason>;
  findById: (id: number) => Promise<RejectReason | undefined>;
};

type RejectReasonWriter = {
  create: (input: CreateRejectReason) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateRejectReason) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class RejectReasonReaderRepository implements RejectReasonReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: RejectReasonReaderDeps) {
    this.db = db;
    this.region = region;
  }

  private areaAgg() {
    return this.db.$with("area_agg").as(
      this.db
        .select({
          reasonId: rejectReasonAreaTable.reasonId,
          areaIds: sql<number[]>`ARRAY_AGG(${rejectReasonAreaTable.areaId})`.as("areaIds"),
        })
        .from(rejectReasonAreaTable)
        .groupBy(rejectReasonAreaTable.reasonId),
    );
  }

  private lineAgg() {
    return this.db.$with("line_agg").as(
      this.db
        .select({
          reasonId: rejectReasonLineTable.reasonId,
          lineIds: sql<number[]>`ARRAY_AGG(${rejectReasonLineTable.lineId})`.as("lineIds"),
        })
        .from(rejectReasonLineTable)
        .groupBy(rejectReasonLineTable.reasonId),
    );
  }

  private machineAgg() {
    return this.db.$with("machine_agg").as(
      this.db
        .select({
          reasonId: rejectReasonMachineTable.reasonId,
          machineIds: sql<number[]>`ARRAY_AGG(${rejectReasonMachineTable.machineId})`.as(
            "machineIds",
          ),
        })
        .from(rejectReasonMachineTable)
        .groupBy(rejectReasonMachineTable.reasonId),
    );
  }

  async findAll({ limit, offset, filter }: ListRejectReasonInput): Promise<PagedRejectReason> {
    const baseConds = [eq(rejectReasonTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(rejectReasonTable.name, pattern),
        ilike(rejectReasonTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .with(this.areaAgg(), this.lineAgg(), this.machineAgg())
        .select({
          id: rejectReasonTable.id,
          name: rejectReasonTable.name,
          code: rejectReasonTable.code,
          region: rejectReasonTable.region,
          createdAt: rejectReasonTable.createdAt,
          areaIds: sql<number[]>`COALESCE(${this.areaAgg().areaIds}, ARRAY[]::int[])`,
          lineIds: sql<number[]>`COALESCE(${this.lineAgg().lineIds}, ARRAY[]::int[])`,
          machineIds: sql<number[]>`COALESCE(${this.machineAgg().machineIds}, ARRAY[]::int[])`,
        })
        .from(rejectReasonTable)
        .leftJoin(this.areaAgg(), eq(rejectReasonTable.id, this.areaAgg().reasonId))
        .leftJoin(this.lineAgg(), eq(rejectReasonTable.id, this.lineAgg().reasonId))
        .leftJoin(this.machineAgg(), eq(rejectReasonTable.id, this.machineAgg().reasonId))
        .where(where)
        .orderBy(desc(rejectReasonTable.createdAt), asc(rejectReasonTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(rejectReasonTable.id) })
        .from(rejectReasonTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<RejectReason | undefined> {
    const row = await this.db.query.rejectReasonTable.findFirst({
      where: { id, region: this.region },
      with: {
        areas: {
          columns: { areaId: true },
        },
        lines: {
          columns: { lineId: true },
        },
        machines: {
          columns: { machineId: true },
        },
      },
    });

    if (!row) {
      return undefined;
    }

    return {
      ...row,
      areaIds: row.areas.map((area) => area.areaId),
      lineIds: row.lines.map((line) => line.lineId),
      machineIds: row.machines.map((machine) => machine.machineId),
    };
  }
}

type RejectReasonShapeIn = Pick<CreateRejectReason, "code" | "name">;
type UpdateRejectReasonShapeIn = Partial<RejectReasonShapeIn>;

class RejectReasonWriterRepository implements RejectReasonWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: RejectReasonWriterDeps) {
    this.db = db;
    this.region = region;
  }

  private diffByKey<T>(
    next: T[],
    existing: T[],
    key: (item: T) => unknown,
  ): { toAdd: T[]; toRemove: T[] } {
    const existingKeys = new Set(existing.map(key));
    const nextKeys = new Set(next.map(key));
    return {
      toAdd: next.filter((r) => !existingKeys.has(key(r))),
      toRemove: existing.filter((r) => !nextKeys.has(key(r))),
    };
  }

  private async insertReason(tx: Transaction, input: RejectReasonShapeIn): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .insert(rejectReasonTable)
        .values({
          code: input.code,
          name: input.name,
          region: this.region,
        })
        .returning({
          id: rejectReasonTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateRejectReasonError(input.code);
      }
      throw err;
    }
  }

  private async updateReason(
    tx: Transaction,
    reasonId: number,
    patch: UpdateRejectReasonShapeIn,
  ): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .update(rejectReasonTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(rejectReasonTable.region, this.region), eq(rejectReasonTable.id, reasonId)))
        .returning({
          id: rejectReasonTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateRejectReasonError(patch.code);
      }
      throw err;
    }
  }

  private async insertReasonAreas(
    tx: Transaction,
    reasonId: number,
    areaIds: number[],
  ): Promise<void> {
    if (areaIds.length === 0) return;
    await tx.insert(rejectReasonAreaTable).values(
      areaIds.map((a) => ({
        region: this.region,
        areaId: a,
        reasonId,
      })),
    );
  }

  private async updateReasonAreas(
    tx: Transaction,
    reasonId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (a) => a);
    if (toRemove.length > 0) {
      await tx
        .delete(rejectReasonAreaTable)
        .where(
          and(
            eq(rejectReasonAreaTable.region, this.region),
            eq(rejectReasonAreaTable.reasonId, reasonId),
            inArray(rejectReasonAreaTable.areaId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(rejectReasonAreaTable).values(
        toAdd.map((a) => ({
          region: this.region,
          areaId: a,
          reasonId,
        })),
      );
    }
  }

  private async insertReasonLines(
    tx: Transaction,
    reasonId: number,
    lineIds: number[],
  ): Promise<void> {
    if (lineIds.length === 0) return;
    await tx.insert(rejectReasonLineTable).values(
      lineIds.map((l) => ({
        region: this.region,
        lineId: l,
        reasonId,
      })),
    );
  }

  private async updateReasonLines(
    tx: Transaction,
    reasonId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (l) => l);
    if (toRemove.length > 0) {
      await tx
        .delete(rejectReasonLineTable)
        .where(
          and(
            eq(rejectReasonLineTable.region, this.region),
            eq(rejectReasonLineTable.reasonId, reasonId),
            inArray(rejectReasonLineTable.lineId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(rejectReasonLineTable).values(
        toAdd.map((l) => ({
          region: this.region,
          lineId: l,
          reasonId,
        })),
      );
    }
  }

  private async insertReasonMachines(
    tx: Transaction,
    reasonId: number,
    machineIds: number[],
  ): Promise<void> {
    if (machineIds.length === 0) return;
    await tx.insert(rejectReasonMachineTable).values(
      machineIds.map((m) => ({
        region: this.region,
        machineId: m,
        reasonId,
      })),
    );
  }

  private async updateReasonMachines(
    tx: Transaction,
    reasonId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (m) => m);
    if (toRemove.length > 0) {
      await tx
        .delete(rejectReasonMachineTable)
        .where(
          and(
            eq(rejectReasonMachineTable.region, this.region),
            eq(rejectReasonMachineTable.reasonId, reasonId),
            inArray(rejectReasonMachineTable.machineId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(rejectReasonMachineTable).values(
        toAdd.map((m) => ({
          region: this.region,
          machineId: m,
          reasonId,
        })),
      );
    }
  }

  private async findAllReasonArea(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.rejectReasonAreaTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { areaId: true },
    });

    return rows.map((a) => a.areaId);
  }

  private async findAllReasonLine(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.rejectReasonLineTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { lineId: true },
    });

    return rows.map((l) => l.lineId);
  }

  private async findAllReasonMachine(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.rejectReasonMachineTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { machineId: true },
    });

    return rows.map((m) => m.machineId);
  }

  async create(input: CreateRejectReason): Promise<{ id: number }> {
    const reason = await this.db.transaction(async (tx) => {
      const { areaIds, lineIds, machineIds, ...reasonShape } = input;
      const save = await this.insertReason(tx, reasonShape);
      await this.insertReasonAreas(tx, save.id, areaIds);
      await this.insertReasonLines(tx, save.id, lineIds);
      await this.insertReasonMachines(tx, save.id, machineIds);

      return save;
    });

    return reason;
  }

  async update(id: number, patch: UpdateRejectReason): Promise<{ id: number }> {
    const reason = await this.db.transaction(async (tx) => {
      const {
        areaIds: nextAreaIds,
        lineIds: nextLineIds,
        machineIds: nextMachineIds,
        ...reasonShape
      } = patch;
      const save = await this.updateReason(tx, id, reasonShape);

      if (nextAreaIds) {
        const existingAreaIds = await this.findAllReasonArea(tx, save.id);
        await this.updateReasonAreas(tx, save.id, nextAreaIds, existingAreaIds);
      }

      if (nextLineIds) {
        const existingLineIds = await this.findAllReasonLine(tx, save.id);
        await this.updateReasonLines(tx, save.id, nextLineIds, existingLineIds);
      }

      if (nextMachineIds) {
        const existingMachineIds = await this.findAllReasonMachine(tx, save.id);
        await this.updateReasonMachines(tx, save.id, nextMachineIds, existingMachineIds);
      }

      return save;
    });

    return reason;
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(rejectReasonTable)
      .where(and(eq(rejectReasonTable.region, this.region), eq(rejectReasonTable.id, id)));
  }
}

export { RejectReasonReaderRepository, RejectReasonWriterRepository };
export type {
  RejectReasonReaderDeps,
  RejectReasonWriterDeps,
  RejectReasonReader,
  RejectReasonWriter,
};
