import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { DuplicateEquipmentClassError } from "./equipment-class-errors.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { equipmentClassTable } from "../../shared/database/schema/schema.js";
import type {
  CreateEquipmentClass,
  EquipmentClass,
  ListEquipmentClassInput,
  PagedEquipmentClass,
  UpdateEquipmentClass,
} from "./equipment-class.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type EquipmentClassReaderDeps = {
  db: PostgresDB;
  region: string;
};

type EquipmentClassWriterDeps = {
  db: PostgresDB;
  region: string;
};

type EquipmentClassReader = {
  findAll: (input: ListEquipmentClassInput) => Promise<PagedEquipmentClass>;
  findById: (id: number) => Promise<EquipmentClass | undefined>;
  existById: (id: number) => Promise<boolean>;
};

type EquipmentClassWriter = {
  create: (equipmentClass: CreateEquipmentClass) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateEquipmentClass) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class EquipmentClassReaderRepository implements EquipmentClassReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EquipmentClassReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListEquipmentClassInput): Promise<PagedEquipmentClass> {
    const baseConds = [eq(equipmentClassTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(equipmentClassTable.name, pattern),
        ilike(equipmentClassTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: equipmentClassTable.id,
          code: equipmentClassTable.code,
          name: equipmentClassTable.name,
          region: equipmentClassTable.region,
          createdAt: equipmentClassTable.createdAt,
          updatedAt: equipmentClassTable.updatedAt,
        })
        .from(equipmentClassTable)
        .where(where)
        .orderBy(desc(equipmentClassTable.createdAt), asc(equipmentClassTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(equipmentClassTable.id) })
        .from(equipmentClassTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<EquipmentClass | undefined> {
    return await this.db.query.equipmentClassTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.equipmentClassTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }
}

class EquipmentClassWriterRepository implements EquipmentClassWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EquipmentClassWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(equipmentClass: CreateEquipmentClass): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(equipmentClassTable)
        .values({
          code: equipmentClass.code,
          name: equipmentClass.name,
          region: this.region,
        })
        .returning({
          id: equipmentClassTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateEquipmentClassError(equipmentClass.code);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateEquipmentClass): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(equipmentClassTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(equipmentClassTable.id, id), eq(equipmentClassTable.region, this.region)))
        .returning({
          id: equipmentClassTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateEquipmentClassError(patch.code);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(equipmentClassTable)
      .where(and(eq(equipmentClassTable.id, id), eq(equipmentClassTable.region, this.region)));
  }
}

export { EquipmentClassReaderRepository, EquipmentClassWriterRepository };
export type {
  EquipmentClassReaderDeps,
  EquipmentClassWriterDeps,
  EquipmentClassReader,
  EquipmentClassWriter,
};
