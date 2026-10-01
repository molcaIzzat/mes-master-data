import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { DuplicateWorkCenterClassError } from "./work-center-class-errors.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { workCenterClassTable } from "../../shared/database/schema/schema.js";

import type {
  CreateWorkCenterClass,
  WorkCenterClass,
  ListWorkCenterClassInput,
  PagedWorkCenterClass,
  UpdateWorkCenterClass,
} from "./work-center-class.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type WorkCenterClassReaderDeps = {
  db: PostgresDB;
  region: string;
};

type WorkCenterClassWriterDeps = {
  db: PostgresDB;
  region: string;
};

type WorkCenterClassReader = {
  findAll: (input: ListWorkCenterClassInput) => Promise<PagedWorkCenterClass>;
  findById: (id: number) => Promise<WorkCenterClass | undefined>;
  existById: (id: number) => Promise<boolean>;
};

type WorkCenterClassWriter = {
  create: (workCenterClass: CreateWorkCenterClass) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateWorkCenterClass) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class WorkCenterClassReaderRepository implements WorkCenterClassReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkCenterClassReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({
    limit,
    offset,
    filter,
  }: ListWorkCenterClassInput): Promise<PagedWorkCenterClass> {
    const baseConds = [eq(workCenterClassTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(workCenterClassTable.name, pattern),
        ilike(workCenterClassTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: workCenterClassTable.id,
          code: workCenterClassTable.code,
          name: workCenterClassTable.name,
          region: workCenterClassTable.region,
          createdAt: workCenterClassTable.createdAt,
          updatedAt: workCenterClassTable.updatedAt,
        })
        .from(workCenterClassTable)
        .where(where)
        .orderBy(desc(workCenterClassTable.createdAt), asc(workCenterClassTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(workCenterClassTable.id) })
        .from(workCenterClassTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<WorkCenterClass | undefined> {
    return await this.db.query.workCenterClassTable.findFirst({
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
    const row = await this.db.query.workCenterClassTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }
}

class WorkCenterClassWriterRepository implements WorkCenterClassWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkCenterClassWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(workCenterClass: CreateWorkCenterClass): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(workCenterClassTable)
        .values({
          code: workCenterClass.code,
          name: workCenterClass.name,
          region: this.region,
        })
        .returning({
          id: workCenterClassTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateWorkCenterClassError(workCenterClass.code);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateWorkCenterClass): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(workCenterClassTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(workCenterClassTable.id, id), eq(workCenterClassTable.region, this.region)))
        .returning({
          id: workCenterClassTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateWorkCenterClassError(patch.code);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(workCenterClassTable)
      .where(and(eq(workCenterClassTable.id, id), eq(workCenterClassTable.region, this.region)));
  }
}

export { WorkCenterClassReaderRepository, WorkCenterClassWriterRepository };
export type {
  WorkCenterClassReaderDeps,
  WorkCenterClassWriterDeps,
  WorkCenterClassReader,
  WorkCenterClassWriter,
};
