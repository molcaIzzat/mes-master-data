import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { DuplicateLineError, InvalidLineAreaIdReferenceError } from "./line-errors.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { lineTable } from "../../shared/database/schema/schema.js";

import type { CreateLine, Line, ListLineInput, PagedLine, UpdateLine } from "./line.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { LineSummary } from "@molca/contract-client";

type LineReaderDeps = {
  db: PostgresDB;
  region: string;
};

type LineWriterDeps = {
  db: PostgresDB;
  region: string;
};

type LineReader = {
  findAll: (input: ListLineInput) => Promise<PagedLine>;
  findById: (id: number) => Promise<Line | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<LineSummary[]>;
};

type LineWriter = {
  create: (line: CreateLine) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateLine) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class LineReaderRepository implements LineReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: LineReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListLineInput): Promise<PagedLine> {
    const baseConds = [eq(lineTable.region, this.region)];

    if (filter.areaId !== undefined) baseConds.push(eq(lineTable.areaId, filter.areaId));
    if (filter.category !== undefined) baseConds.push(eq(lineTable.category, filter.category));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(lineTable.name, pattern), ilike(lineTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: lineTable.id,
          code: lineTable.code,
          name: lineTable.name,
          areaId: lineTable.areaId,
          category: lineTable.category,
          region: lineTable.region,
          createdAt: lineTable.createdAt,
          updatedAt: lineTable.updatedAt,
        })
        .from(lineTable)
        .where(where)
        .orderBy(desc(lineTable.createdAt), asc(lineTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(lineTable.id) })
        .from(lineTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Line | undefined> {
    return await this.db.query.lineTable.findFirst({
      where: { id, region: this.region },
      with: {
        area: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.lineTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }

  async findSummariesByIds(ids: number[]): Promise<LineSummary[]> {
    return await this.db.query.lineTable.findMany({
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

class LineWriterRepository implements LineWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: LineWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(line: CreateLine): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(lineTable)
        .values({
          code: line.code,
          name: line.name,
          areaId: line.areaId,
          category: line.category,
          region: this.region,
        })
        .returning({
          id: lineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateLineError(line.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidLineAreaIdReferenceError(line.areaId);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateLine): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(lineTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(lineTable.id, id), eq(lineTable.region, this.region)))
        .returning({
          id: lineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateLineError(patch.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidLineAreaIdReferenceError(patch.areaId);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(lineTable)
      .where(and(eq(lineTable.id, id), eq(lineTable.region, this.region)));
  }
}

export { LineReaderRepository, LineWriterRepository };
export type { LineReaderDeps, LineWriterDeps, LineReader, LineWriter };
