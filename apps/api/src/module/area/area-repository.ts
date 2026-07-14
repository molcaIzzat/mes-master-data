import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { areaTable } from "../../shared/database/schema/schema.js";

import type { Area, CreateArea, ListAreaInput, PagedArea, UpdateArea } from "./area.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { DuplicateAreaError } from "./area-errors.js";
import type { AreaSummary } from "@molca/contract-client";

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
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<AreaSummary[]>;
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

    if (filter.siteId !== undefined) baseConds.push(eq(areaTable.siteId, filter.siteId));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(areaTable.name, pattern), ilike(areaTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: areaTable.id,
          code: areaTable.code,
          name: areaTable.name,
          siteId: areaTable.siteId,
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

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.areaTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }

  async findSummariesByIds(ids: number[]): Promise<AreaSummary[]> {
    return await this.db.query.areaTable.findMany({
      where: {
        id: {
          in: ids,
        },
        region: this.region,
      },
      columns: { id: true, name: true, code: true },
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
          code: area.code,
          region: this.region,
          siteId: area.siteId,
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
