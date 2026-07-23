import { and, count, eq, ilike, or } from "drizzle-orm";
import type { EquipmentSummary } from "@molca/contract-client";

import { DuplicateEquipmentError, InvalidEquipmentReferenceError } from "./equipment-errors.js";
import {
  FkViolationError,
  toPgConstraintError,
  UniqueViolationError,
} from "../../shared/database/helper/catcher.js";
import { equipmentTable } from "../../shared/database/schema/schema.js";

import type {
  CreateEquipment,
  Equipment,
  ListEquipmentInput,
  PagedEquipment,
  UpdateEquipment,
} from "./equipment.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type EquipmentReaderDeps = {
  db: PostgresDB;
  region: string;
};

type EquipmentWriterDeps = {
  db: PostgresDB;
  region: string;
};

type EquipmentReader = {
  findAll: (input: ListEquipmentInput) => Promise<PagedEquipment>;
  findById: (id: number) => Promise<Equipment | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<EquipmentSummary[]>;
};

type EquipmentWriter = {
  create: (equipment: CreateEquipment) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateEquipment) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class EquipmentReaderRepository implements EquipmentReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EquipmentReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListEquipmentInput): Promise<PagedEquipment> {
    const baseConds = [eq(equipmentTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(equipmentTable.name, pattern), ilike(equipmentTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.equipmentTable.findMany({
        where: {
          region: this.region,
          ...(filter.q !== undefined
            ? {
                OR: [{ name: { ilike: `%${filter.q}%` } }, { code: { ilike: `%${filter.q}%` } }],
              }
            : {}),
        },
        orderBy: (wc, { desc, asc }) => [desc(wc.createdAt), asc(wc.id)],
        limit,
        offset,
        columns: {
          id: true,
          code: true,
          name: true,
          region: true,
          createdAt: true,
          productSignalTag: true,
        },
        with: {
          unit: {
            columns: { id: true, code: true, name: true },
          },
          class: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(equipmentTable.id) })
        .from(equipmentTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Equipment | undefined> {
    return await this.db.query.equipmentTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        region: true,
        productSignalTag: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        unit: {
          columns: { id: true, code: true, name: true },
        },
        class: {
          columns: { id: true, code: true, name: true },
        },
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.equipmentTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }

  async findSummariesByIds(ids: number[]): Promise<EquipmentSummary[]> {
    return await this.db.query.equipmentTable.findMany({
      where: {
        id: {
          in: ids,
        },
        region: this.region,
      },
      columns: { id: true, code: true, name: true },
    });
  }
}

class EquipmentWriterRepository implements EquipmentWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EquipmentWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(equipment: CreateEquipment): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(equipmentTable)
        .values({
          code: equipment.code,
          name: equipment.name,
          region: this.region,
          workUnitId: equipment.workUnitId,
          equipmentClassId: equipment.equipmentClassId,
          productSignalTag: equipment.productSignalTag,
        })
        .returning({
          id: equipmentTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof UniqueViolationError) {
        throw new DuplicateEquipmentError(equipment.code);
      } else if (constraintError instanceof FkViolationError) {
        throw new InvalidEquipmentReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateEquipment): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(equipmentTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(equipmentTable.id, id), eq(equipmentTable.region, this.region)))
        .returning({
          id: equipmentTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof UniqueViolationError) {
        throw new DuplicateEquipmentError(patch.code);
      } else if (constraintError instanceof FkViolationError) {
        throw new InvalidEquipmentReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(equipmentTable)
      .where(and(eq(equipmentTable.id, id), eq(equipmentTable.region, this.region)));
  }
}

export { EquipmentReaderRepository, EquipmentWriterRepository };
export type { EquipmentReaderDeps, EquipmentWriterDeps, EquipmentReader, EquipmentWriter };
