import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { areaTable } from "../../shared/database/schema/schema.js";

import type { Area, CreateArea, ListAreaInput, PagedArea, UpdateArea } from "./area.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { DuplicateAreaError } from "./area-errors.js";

type AreaReaderDeps = {
  db: PostgresDB;
  region: string;
};

type AreaWriterDeps = {
  db: PostgresDB;
  region: string;
};

type AreaReader = {
  findAll: (input: ListAreaInput) => Promise<PagedArea>;
  findById: (id: number) => Promise<Area | undefined>;
};

type AreaWriter = {
  create: (area: CreateArea) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateArea) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class AreaReaderRepository implements AreaReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: AreaReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListAreaInput): Promise<PagedArea> {
    const baseConds = [eq(areaTable.region, this.region)];

    if (filter.factoryId !== undefined) baseConds.push(eq(areaTable.factoryId, filter.factoryId));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(areaTable.name, pattern), ilike(areaTable.displayName, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: areaTable.id,
          name: areaTable.name,
          displayName: areaTable.displayName,
          factoryId: areaTable.factoryId,
          region: areaTable.region,
          createdAt: areaTable.createdAt,
          updatedAt: areaTable.updatedAt,
        })
        .from(areaTable)
        .where(where)
        .orderBy(desc(areaTable.createdAt), asc(areaTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(areaTable.id) })
        .from(areaTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Area | undefined> {
    return await this.db.query.areaTable.findFirst({
      where: { id, region: this.region },
    });
  }
}

class AreaWriterRepository implements AreaWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: AreaWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(area: CreateArea): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(areaTable)
        .values({
          name: area.name,
          displayName: area.displayName,
          region: this.region,
          factoryId: area.factoryId,
        })
        .returning({
          id: areaTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateAreaError(area.name);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateArea): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(areaTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(areaTable.id, id), eq(areaTable.region, this.region)))
        .returning({
          id: areaTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateAreaError(patch.name);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(areaTable)
      .where(and(eq(areaTable.id, id), eq(areaTable.region, this.region)));
  }
}

export { AreaReaderRepository, AreaWriterRepository };
export type { AreaReaderDeps, AreaWriterDeps, AreaReader, AreaWriter };
