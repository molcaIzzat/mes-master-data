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
  rejectReasonWorkCenterTable,
  rejectReasonEquipmentTable,
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

  private workCenterAgg() {
    return this.db.$with("work_center_agg").as(
      this.db
        .select({
          reasonId: rejectReasonWorkCenterTable.reasonId,
          workCenterIds: sql<number[]>`ARRAY_AGG(${rejectReasonWorkCenterTable.workCenterId})`.as(
            "workCenterIds",
          ),
        })
        .from(rejectReasonWorkCenterTable)
        .groupBy(rejectReasonWorkCenterTable.reasonId),
    );
  }

  private equipmentAgg() {
    return this.db.$with("equipment_agg").as(
      this.db
        .select({
          reasonId: rejectReasonEquipmentTable.reasonId,
          equipmentIds: sql<number[]>`ARRAY_AGG(${rejectReasonEquipmentTable.equipmentId})`.as(
            "equipmentIds",
          ),
        })
        .from(rejectReasonEquipmentTable)
        .groupBy(rejectReasonEquipmentTable.reasonId),
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
        .with(this.areaAgg(), this.workCenterAgg(), this.equipmentAgg())
        .select({
          id: rejectReasonTable.id,
          name: rejectReasonTable.name,
          code: rejectReasonTable.code,
          region: rejectReasonTable.region,
          createdAt: rejectReasonTable.createdAt,
          areaIds: sql<number[]>`COALESCE(${this.areaAgg().areaIds}, ARRAY[]::int[])`,
          workCenterIds: sql<
            number[]
          >`COALESCE(${this.workCenterAgg().workCenterIds}, ARRAY[]::int[])`,
          equipmentIds: sql<
            number[]
          >`COALESCE(${this.equipmentAgg().equipmentIds}, ARRAY[]::int[])`,
        })
        .from(rejectReasonTable)
        .leftJoin(this.areaAgg(), eq(rejectReasonTable.id, this.areaAgg().reasonId))
        .leftJoin(this.workCenterAgg(), eq(rejectReasonTable.id, this.workCenterAgg().reasonId))
        .leftJoin(this.equipmentAgg(), eq(rejectReasonTable.id, this.equipmentAgg().reasonId))
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
        workCenters: {
          columns: { workCenterId: true },
        },
        equipments: {
          columns: { equipmentId: true },
        },
      },
    });

    if (!row) {
      return undefined;
    }

    return {
      ...row,
      areaIds: row.areas.map((area) => area.areaId),
      workCenterIds: row.workCenters.map((workCenter) => workCenter.workCenterId),
      equipmentIds: row.equipments.map((equipment) => equipment.equipmentId),
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
      areaIds.map((areaId) => ({
        region: this.region,
        areaId,
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
    const { toAdd, toRemove } = this.diffByKey(next, existing, (areaId) => areaId);
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
        toAdd.map((areaId) => ({
          region: this.region,
          areaId,
          reasonId,
        })),
      );
    }
  }

  private async insertReasonWorkCenters(
    tx: Transaction,
    reasonId: number,
    workCenterIds: number[],
  ): Promise<void> {
    if (workCenterIds.length === 0) return;
    await tx.insert(rejectReasonWorkCenterTable).values(
      workCenterIds.map((workCenterId) => ({
        region: this.region,
        workCenterId,
        reasonId,
      })),
    );
  }

  private async updateReasonWorkCenters(
    tx: Transaction,
    reasonId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (workCenterId) => workCenterId);
    if (toRemove.length > 0) {
      await tx
        .delete(rejectReasonWorkCenterTable)
        .where(
          and(
            eq(rejectReasonWorkCenterTable.region, this.region),
            eq(rejectReasonWorkCenterTable.reasonId, reasonId),
            inArray(rejectReasonWorkCenterTable.workCenterId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(rejectReasonWorkCenterTable).values(
        toAdd.map((workCenterId) => ({
          region: this.region,
          workCenterId,
          reasonId,
        })),
      );
    }
  }

  private async insertReasonEquipments(
    tx: Transaction,
    reasonId: number,
    equipmentIds: number[],
  ): Promise<void> {
    if (equipmentIds.length === 0) return;
    await tx.insert(rejectReasonEquipmentTable).values(
      equipmentIds.map((equipmentId) => ({
        region: this.region,
        equipmentId,
        reasonId,
      })),
    );
  }

  private async updateReasonEquipments(
    tx: Transaction,
    reasonId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (equipmentId) => equipmentId);
    if (toRemove.length > 0) {
      await tx
        .delete(rejectReasonEquipmentTable)
        .where(
          and(
            eq(rejectReasonEquipmentTable.region, this.region),
            eq(rejectReasonEquipmentTable.reasonId, reasonId),
            inArray(rejectReasonEquipmentTable.equipmentId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(rejectReasonEquipmentTable).values(
        toAdd.map((equipmentId) => ({
          region: this.region,
          equipmentId,
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

  private async findAllReasonWorkCenter(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.rejectReasonWorkCenterTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { workCenterId: true },
    });

    return rows.map((l) => l.workCenterId);
  }

  private async findAllReasonEquipment(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.rejectReasonEquipmentTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { equipmentId: true },
    });

    return rows.map((m) => m.equipmentId);
  }

  async create(input: CreateRejectReason): Promise<{ id: number }> {
    const reason = await this.db.transaction(async (tx) => {
      const { areaIds, workCenterIds, equipmentIds, ...reasonShape } = input;
      const save = await this.insertReason(tx, reasonShape);
      await this.insertReasonAreas(tx, save.id, areaIds);
      await this.insertReasonWorkCenters(tx, save.id, workCenterIds);
      await this.insertReasonEquipments(tx, save.id, equipmentIds);

      return save;
    });

    return reason;
  }

  async update(id: number, patch: UpdateRejectReason): Promise<{ id: number }> {
    const reason = await this.db.transaction(async (tx) => {
      const {
        areaIds: nextAreaIds,
        workCenterIds: nextWorkCenterIds,
        equipmentIds: nextEquipmentIds,
        ...reasonShape
      } = patch;
      const save = await this.updateReason(tx, id, reasonShape);

      if (nextAreaIds) {
        const existingAreaIds = await this.findAllReasonArea(tx, save.id);
        await this.updateReasonAreas(tx, save.id, nextAreaIds, existingAreaIds);
      }

      if (nextWorkCenterIds) {
        const existingWorkCenterIds = await this.findAllReasonWorkCenter(tx, save.id);
        await this.updateReasonWorkCenters(tx, save.id, nextWorkCenterIds, existingWorkCenterIds);
      }

      if (nextEquipmentIds) {
        const existingEquipmentIds = await this.findAllReasonEquipment(tx, save.id);
        await this.updateReasonEquipments(tx, save.id, nextEquipmentIds, existingEquipmentIds);
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
