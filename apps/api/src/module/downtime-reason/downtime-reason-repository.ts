import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";
import type {
  CreateDowntimeReason,
  DowntimeReason,
  ListDowntimeReasonInput,
  PagedDowntimeReason,
  UpdateDowntimeReason,
} from "./downtime-reason.js";
import {
  downtimeReasonAreaTable,
  downtimeReasonLineTable,
  downtimeReasonMachineTable,
  downtimeReasonTable,
} from "../../shared/database/schema/schema.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { DuplicateDowntimeReasonError } from "./downtime-reason-errors.js";

type DowntimeReasonReaderDeps = {
  db: PostgresDB;
  region: string;
};

type DowntimeReasonWriterDeps = {
  db: PostgresDB;
  region: string;
};

type DowntimeReasonReader = {
  findAll: (input: ListDowntimeReasonInput) => Promise<PagedDowntimeReason>;
  findById: (id: number) => Promise<DowntimeReason | undefined>;
};

type DowntimeReasonWriter = {
  create: (input: CreateDowntimeReason) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateDowntimeReason) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class DowntimeReasonReaderRepository implements DowntimeReasonReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: DowntimeReasonReaderDeps) {
    this.db = db;
    this.region = region;
  }

  private areaAgg() {
    return this.db.$with("area_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonAreaTable.reasonId,
          areaIds: sql<number[]>`ARRAY_AGG(${downtimeReasonAreaTable.areaId})`.as("areaIds"),
        })
        .from(downtimeReasonAreaTable)
        .groupBy(downtimeReasonAreaTable.reasonId),
    );
  }

  private lineAgg() {
    return this.db.$with("line_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonLineTable.reasonId,
          lineIds: sql<number[]>`ARRAY_AGG(${downtimeReasonLineTable.lineId})`.as("lineIds"),
        })
        .from(downtimeReasonLineTable)
        .groupBy(downtimeReasonLineTable.reasonId),
    );
  }

  private machineAgg() {
    return this.db.$with("machine_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonMachineTable.reasonId,
          machineIds: sql<number[]>`ARRAY_AGG(${downtimeReasonMachineTable.machineId})`.as(
            "machineIds",
          ),
        })
        .from(downtimeReasonMachineTable)
        .groupBy(downtimeReasonMachineTable.reasonId),
    );
  }

  async findAll({ limit, offset, filter }: ListDowntimeReasonInput): Promise<PagedDowntimeReason> {
    const baseConds = [eq(downtimeReasonTable.region, this.region)];

    if (filter.category !== undefined)
      baseConds.push(eq(downtimeReasonTable.category, filter.category));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(downtimeReasonTable.name, pattern),
        ilike(downtimeReasonTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .with(this.areaAgg(), this.lineAgg(), this.machineAgg())
        .select({
          id: downtimeReasonTable.id,
          name: downtimeReasonTable.name,
          code: downtimeReasonTable.code,
          category: downtimeReasonTable.category,
          region: downtimeReasonTable.region,
          createdAt: downtimeReasonTable.createdAt,
          areaIds: sql<number[]>`COALESCE(${this.areaAgg().areaIds}, ARRAY[]::int[])`,
          lineIds: sql<number[]>`COALESCE(${this.lineAgg().lineIds}, ARRAY[]::int[])`,
          machineIds: sql<number[]>`COALESCE(${this.machineAgg().machineIds}, ARRAY[]::int[])`,
        })
        .from(downtimeReasonTable)
        .leftJoin(this.areaAgg(), eq(downtimeReasonTable.id, this.areaAgg().reasonId))
        .leftJoin(this.lineAgg(), eq(downtimeReasonTable.id, this.lineAgg().reasonId))
        .leftJoin(this.machineAgg(), eq(downtimeReasonTable.id, this.machineAgg().reasonId))
        .where(where)
        .orderBy(desc(downtimeReasonTable.createdAt), asc(downtimeReasonTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(downtimeReasonTable.id) })
        .from(downtimeReasonTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<DowntimeReason | undefined> {
    const row = await this.db.query.downtimeReasonTable.findFirst({
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

type DowntimeReasonShapeIn = Pick<CreateDowntimeReason, "code" | "name" | "category">;
type UpdateDowntimeReasonShapeIn = Partial<DowntimeReasonShapeIn>;

class DowntimeReasonWriterRepository implements DowntimeReasonWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: DowntimeReasonWriterDeps) {
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

  private async insertReason(
    tx: Transaction,
    input: DowntimeReasonShapeIn,
  ): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .insert(downtimeReasonTable)
        .values({
          code: input.code,
          name: input.name,
          category: input.category,
          region: this.region,
        })
        .returning({
          id: downtimeReasonTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateDowntimeReasonError(input.code);
      }
      throw err;
    }
  }

  private async updateReason(
    tx: Transaction,
    reasonId: number,
    patch: UpdateDowntimeReasonShapeIn,
  ): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .update(downtimeReasonTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(
          and(eq(downtimeReasonTable.region, this.region), eq(downtimeReasonTable.id, reasonId)),
        )
        .returning({
          id: downtimeReasonTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateDowntimeReasonError(patch.code);
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
    await tx.insert(downtimeReasonAreaTable).values(
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
        .delete(downtimeReasonAreaTable)
        .where(
          and(
            eq(downtimeReasonAreaTable.region, this.region),
            eq(downtimeReasonAreaTable.reasonId, reasonId),
            inArray(downtimeReasonAreaTable.areaId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(downtimeReasonAreaTable).values(
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
    await tx.insert(downtimeReasonLineTable).values(
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
        .delete(downtimeReasonLineTable)
        .where(
          and(
            eq(downtimeReasonLineTable.region, this.region),
            eq(downtimeReasonLineTable.reasonId, reasonId),
            inArray(downtimeReasonLineTable.lineId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(downtimeReasonLineTable).values(
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
    await tx.insert(downtimeReasonMachineTable).values(
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
        .delete(downtimeReasonMachineTable)
        .where(
          and(
            eq(downtimeReasonMachineTable.region, this.region),
            eq(downtimeReasonMachineTable.reasonId, reasonId),
            inArray(downtimeReasonMachineTable.machineId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(downtimeReasonMachineTable).values(
        toAdd.map((m) => ({
          region: this.region,
          machineId: m,
          reasonId,
        })),
      );
    }
  }

  private async findAllReasonArea(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.downtimeReasonAreaTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { areaId: true },
    });

    return rows.map((a) => a.areaId);
  }

  private async findAllReasonLine(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.downtimeReasonLineTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { lineId: true },
    });

    return rows.map((l) => l.lineId);
  }

  private async findAllReasonMachine(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.downtimeReasonMachineTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { machineId: true },
    });

    return rows.map((m) => m.machineId);
  }

  async create(input: CreateDowntimeReason): Promise<{ id: number }> {
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

  async update(id: number, patch: UpdateDowntimeReason): Promise<{ id: number }> {
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
      .delete(downtimeReasonTable)
      .where(and(eq(downtimeReasonTable.region, this.region), eq(downtimeReasonTable.id, id)));
  }
}

export { DowntimeReasonReaderRepository, DowntimeReasonWriterRepository };
export type {
  DowntimeReasonReaderDeps,
  DowntimeReasonWriterDeps,
  DowntimeReasonReader,
  DowntimeReasonWriter,
};
