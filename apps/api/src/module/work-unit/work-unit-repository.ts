import { and, count, eq, ilike, or } from "drizzle-orm";

import {
  DuplicateWorkUnitError,
  InvalidWorkUnitWorkCenterIdReferenceError,
} from "./work-unit-errors.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { workUnitTable } from "../../shared/database/schema/schema.js";

import type {
  CreateWorkUnit,
  WorkUnit,
  ListWorkUnitInput,
  PagedWorkUnit,
  UpdateWorkUnit,
} from "./work-unit.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type WorkUnitReaderDeps = {
  db: PostgresDB;
  region: string;
};

type WorkUnitWriterDeps = {
  db: PostgresDB;
  region: string;
};

type WorkUnitReader = {
  findAll: (input: ListWorkUnitInput) => Promise<PagedWorkUnit>;
  findById: (id: number) => Promise<WorkUnit | undefined>;
  existById: (id: number) => Promise<boolean>;
};

type WorkUnitWriter = {
  create: (workUnit: CreateWorkUnit) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateWorkUnit) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class WorkUnitReaderRepository implements WorkUnitReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkUnitReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListWorkUnitInput): Promise<PagedWorkUnit> {
    const baseConds = [eq(workUnitTable.region, this.region)];

    if (filter.workCenterId !== undefined)
      baseConds.push(eq(workUnitTable.workCenterId, filter.workCenterId));
    if (filter.type !== undefined) baseConds.push(eq(workUnitTable.type, filter.type));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(workUnitTable.name, pattern), ilike(workUnitTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.workUnitTable.findMany({
        where: {
          region: this.region,
          ...(filter.workCenterId !== undefined ? { workCenterId: filter.workCenterId } : {}),
          ...(filter.type !== undefined ? { type: filter.type } : {}),
          ...(filter.q !== undefined
            ? {
                OR: [{ name: { ilike: `%${filter.q}%` } }, { code: { ilike: `%${filter.q}%` } }],
              }
            : {}),
        },
        orderBy: (wu, { desc, asc }) => [desc(wu.createdAt), asc(wu.id)],
        limit,
        offset,
        columns: {
          id: true,
          code: true,
          name: true,
          type: true,
          position: true,
          region: true,
          createdAt: true,
        },
        with: {
          workCenter: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(workUnitTable.id) })
        .from(workUnitTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<WorkUnit | undefined> {
    return await this.db.query.workUnitTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        type: true,
        position: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        workCenter: {
          columns: { id: true, code: true, name: true },
        },
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.workUnitTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }
}

class WorkUnitWriterRepository implements WorkUnitWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkUnitWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(workUnit: CreateWorkUnit): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(workUnitTable)
        .values({
          code: workUnit.code,
          workCenterId: workUnit.workCenterId,
          name: workUnit.name,
          type: workUnit.type,
          position: workUnit.position,
          region: this.region,
        })
        .returning({
          id: workUnitTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateWorkUnitError(workUnit.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidWorkUnitWorkCenterIdReferenceError(workUnit.workCenterId);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateWorkUnit): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(workUnitTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(workUnitTable.id, id), eq(workUnitTable.region, this.region)))
        .returning({
          id: workUnitTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateWorkUnitError(patch.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidWorkUnitWorkCenterIdReferenceError(patch.workCenterId);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(workUnitTable)
      .where(and(eq(workUnitTable.id, id), eq(workUnitTable.region, this.region)));
  }
}

export { WorkUnitReaderRepository, WorkUnitWriterRepository };
export type { WorkUnitReaderDeps, WorkUnitWriterDeps, WorkUnitReader, WorkUnitWriter };
