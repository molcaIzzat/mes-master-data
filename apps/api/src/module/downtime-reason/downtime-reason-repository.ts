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
  downtimeReasonWorkCenterTable,
  downtimeReasonEquipmentTable,
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

  private workCenterAgg() {
    return this.db.$with("work_center_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonWorkCenterTable.reasonId,
          workCenterIds: sql<number[]>`ARRAY_AGG(${downtimeReasonWorkCenterTable.workCenterId})`.as(
            "workCenterIds",
          ),
        })
        .from(downtimeReasonWorkCenterTable)
        .groupBy(downtimeReasonWorkCenterTable.reasonId),
    );
  }

  private equipmentAgg() {
    return this.db.$with("equipment_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonEquipmentTable.reasonId,
          equipmentIds: sql<number[]>`ARRAY_AGG(${downtimeReasonEquipmentTable.equipmentId})`.as(
            "equipmentIds",
          ),
        })
        .from(downtimeReasonEquipmentTable)
        .groupBy(downtimeReasonEquipmentTable.reasonId),
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
        .with(this.areaAgg(), this.workCenterAgg(), this.equipmentAgg())
        .select({
          id: downtimeReasonTable.id,
          name: downtimeReasonTable.name,
          code: downtimeReasonTable.code,
          category: downtimeReasonTable.category,
          region: downtimeReasonTable.region,
          createdAt: downtimeReasonTable.createdAt,
          areaIds: sql<number[]>`COALESCE(${this.areaAgg().areaIds}, ARRAY[]::int[])`,
          workCenterIds: sql<
            number[]
          >`COALESCE(${this.workCenterAgg().workCenterIds}, ARRAY[]::int[])`,
          equipmentIds: sql<
            number[]
          >`COALESCE(${this.equipmentAgg().equipmentIds}, ARRAY[]::int[])`,
        })
        .from(downtimeReasonTable)
        .leftJoin(this.areaAgg(), eq(downtimeReasonTable.id, this.areaAgg().reasonId))
        .leftJoin(this.workCenterAgg(), eq(downtimeReasonTable.id, this.workCenterAgg().reasonId))
        .leftJoin(this.equipmentAgg(), eq(downtimeReasonTable.id, this.equipmentAgg().reasonId))
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
      workCenterIds: row.workCenters.map((wc) => wc.workCenterId),
      equipmentIds: row.equipments.map((equipment) => equipment.equipmentId),
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
    await tx.insert(downtimeReasonWorkCenterTable).values(
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
    const { toAdd, toRemove } = this.diffByKey(next, existing, (l) => l);
    if (toRemove.length > 0) {
      await tx
        .delete(downtimeReasonWorkCenterTable)
        .where(
          and(
            eq(downtimeReasonWorkCenterTable.region, this.region),
            eq(downtimeReasonWorkCenterTable.reasonId, reasonId),
            inArray(downtimeReasonWorkCenterTable.workCenterId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(downtimeReasonWorkCenterTable).values(
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
    await tx.insert(downtimeReasonEquipmentTable).values(
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
    const { toAdd, toRemove } = this.diffByKey(next, existing, (m) => m);
    if (toRemove.length > 0) {
      await tx
        .delete(downtimeReasonEquipmentTable)
        .where(
          and(
            eq(downtimeReasonEquipmentTable.region, this.region),
            eq(downtimeReasonEquipmentTable.reasonId, reasonId),
            inArray(downtimeReasonEquipmentTable.equipmentId, toRemove),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(downtimeReasonEquipmentTable).values(
        toAdd.map((equipmentId) => ({
          region: this.region,
          equipmentId,
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

  private async findAllReasonWorkCenter(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.downtimeReasonWorkCenterTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { workCenterId: true },
    });

    return rows.map((workCenter) => workCenter.workCenterId);
  }

  private async findAllReasonEquipment(tx: Transaction, reasonId: number): Promise<number[]> {
    const rows = await tx.query.downtimeReasonEquipmentTable.findMany({
      where: {
        region: this.region,
        reasonId,
      },
      columns: { equipmentId: true },
    });

    return rows.map((equipment) => equipment.equipmentId);
  }

  async create(input: CreateDowntimeReason): Promise<{ id: number }> {
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

  async update(id: number, patch: UpdateDowntimeReason): Promise<{ id: number }> {
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
