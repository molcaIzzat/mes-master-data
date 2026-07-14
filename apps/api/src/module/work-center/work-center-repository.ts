import { and, count, eq, ilike, or } from "drizzle-orm";
import type { WorkCenterSummary } from "@molca/contract-client";

import {
  DuplicateWorkCenterError,
  InvalidWorkCenterAreaIdReferenceError,
} from "./work-center-errors.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { workCenterTable } from "../../shared/database/schema/schema.js";

import type {
  CreateWorkCenter,
  WorkCenter,
  ListWorkCenterInput,
  PagedWorkCenter,
  UpdateWorkCenter,
} from "./work-center.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type WorkCenterReaderDeps = {
  db: PostgresDB;
  region: string;
};

type WorkCenterWriterDeps = {
  db: PostgresDB;
  region: string;
};

type WorkCenterReader = {
  findAll: (input: ListWorkCenterInput) => Promise<PagedWorkCenter>;
  findById: (id: number) => Promise<WorkCenter | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<WorkCenterSummary[]>;
};

type WorkCenterWriter = {
  create: (workCenter: CreateWorkCenter) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateWorkCenter) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class WorkCenterReaderRepository implements WorkCenterReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkCenterReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListWorkCenterInput): Promise<PagedWorkCenter> {
    const baseConds = [eq(workCenterTable.region, this.region)];

    if (filter.areaId !== undefined) baseConds.push(eq(workCenterTable.areaId, filter.areaId));
    if (filter.type !== undefined) baseConds.push(eq(workCenterTable.type, filter.type));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(workCenterTable.name, pattern), ilike(workCenterTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.workCenterTable.findMany({
        where: {
          region: this.region,
          ...(filter.areaId !== undefined ? { areaId: filter.areaId } : {}),
          ...(filter.type !== undefined ? { type: filter.type } : {}),
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
          type: true,
          oeeMode: true,
          idealRatePerHour: true,
          region: true,
          createdAt: true,
        },
        with: {
          area: {
            columns: { id: true, code: true, name: true },
          },
          class: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(workCenterTable.id) })
        .from(workCenterTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<WorkCenter | undefined> {
    return await this.db.query.workCenterTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        type: true,
        oeeMode: true,
        idealRatePerHour: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        area: {
          columns: { id: true, code: true, name: true },
        },
        class: {
          columns: { id: true, code: true, name: true },
        },
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.workCenterTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }

  async findSummariesByIds(ids: number[]): Promise<WorkCenterSummary[]> {
    return await this.db.query.workCenterTable.findMany({
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

class WorkCenterWriterRepository implements WorkCenterWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkCenterWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(workCenter: CreateWorkCenter): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(workCenterTable)
        .values({
          code: workCenter.code,
          name: workCenter.name,
          areaId: workCenter.areaId,
          oeeMode: workCenter.oeeMode,
          type: workCenter.type,
          workCenterClassId: workCenter.workCenterClassId,
          idealRatePerHour: workCenter.idealRatePerHour,
          region: this.region,
        })
        .returning({
          id: workCenterTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateWorkCenterError(workCenter.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidWorkCenterAreaIdReferenceError(workCenter.areaId);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateWorkCenter): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(workCenterTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(workCenterTable.id, id), eq(workCenterTable.region, this.region)))
        .returning({
          id: workCenterTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateWorkCenterError(patch.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidWorkCenterAreaIdReferenceError(patch.areaId);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(workCenterTable)
      .where(and(eq(workCenterTable.id, id), eq(workCenterTable.region, this.region)));
  }
}

export { WorkCenterReaderRepository, WorkCenterWriterRepository };
export type { WorkCenterReaderDeps, WorkCenterWriterDeps, WorkCenterReader, WorkCenterWriter };
