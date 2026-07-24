import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { DuplicateUomError } from "./uom-errors.js";
import { toPgConstraintError, UniqueViolationError } from "../../shared/database/helper/catcher.js";
import { unitTable } from "../../shared/database/schema/schema.js";

import type { CreateUom, Uom, ListUomInput, PagedUom, UpdateUom } from "./uom.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type UomReaderDeps = {
  db: PostgresDB;
  region: string;
};

type UomWriterDeps = {
  db: PostgresDB;
  region: string;
};

type UomReader = {
  findAll: (input: ListUomInput) => Promise<PagedUom>;
  findById: (id: number) => Promise<Uom | undefined>;
  existById: (id: number) => Promise<boolean>;
};

type UomWriter = {
  create: (unit: CreateUom) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateUom) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class UomReaderRepository implements UomReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: UomReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListUomInput): Promise<PagedUom> {
    const baseConds = [eq(unitTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(unitTable.name, pattern), ilike(unitTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: unitTable.id,
          code: unitTable.code,
          name: unitTable.name,
          region: unitTable.region,
          createdAt: unitTable.createdAt,
          updatedAt: unitTable.updatedAt,
        })
        .from(unitTable)
        .where(where)
        .orderBy(desc(unitTable.createdAt), asc(unitTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(unitTable.id) })
        .from(unitTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Uom | undefined> {
    return await this.db.query.unitTable.findFirst({
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
    const row = await this.db.query.unitTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }
}

class UomWriterRepository implements UomWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: UomWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(unit: CreateUom): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(unitTable)
        .values({
          code: unit.code,
          name: unit.name,
          region: this.region,
        })
        .returning({
          id: unitTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof UniqueViolationError) {
        throw new DuplicateUomError(unit.code);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateUom): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(unitTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(unitTable.id, id), eq(unitTable.region, this.region)))
        .returning({
          id: unitTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof UniqueViolationError) {
        throw new DuplicateUomError(patch.code);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(unitTable)
      .where(and(eq(unitTable.id, id), eq(unitTable.region, this.region)));
  }
}

export { UomReaderRepository, UomWriterRepository };
export type { UomReaderDeps, UomWriterDeps, UomReader, UomWriter };
