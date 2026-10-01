import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { DuplicateWorkUnitClassError } from "./work-unit-class-errors.js";
import { toPgConstraintError, UniqueViolationError } from "../../shared/database/helper/catcher.js";
import { workUnitClassTable } from "../../shared/database/schema/schema.js";

import type {
  CreateWorkUnitClass,
  WorkUnitClass,
  ListWorkUnitClassInput,
  PagedWorkUnitClass,
  UpdateWorkUnitClass,
} from "./work-unit-class.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type WorkUnitClassReaderDeps = {
  db: PostgresDB;
  region: string;
};

type WorkUnitClassWriterDeps = {
  db: PostgresDB;
  region: string;
};

type WorkUnitClassReader = {
  findAll: (input: ListWorkUnitClassInput) => Promise<PagedWorkUnitClass>;
  findById: (id: number) => Promise<WorkUnitClass | undefined>;
  existById: (id: number) => Promise<boolean>;
};

type WorkUnitClassWriter = {
  create: (workUnitClass: CreateWorkUnitClass) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateWorkUnitClass) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class WorkUnitClassReaderRepository implements WorkUnitClassReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkUnitClassReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListWorkUnitClassInput): Promise<PagedWorkUnitClass> {
    const baseConds = [eq(workUnitClassTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(workUnitClassTable.name, pattern),
        ilike(workUnitClassTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: workUnitClassTable.id,
          code: workUnitClassTable.code,
          name: workUnitClassTable.name,
          region: workUnitClassTable.region,
          createdAt: workUnitClassTable.createdAt,
          updatedAt: workUnitClassTable.updatedAt,
        })
        .from(workUnitClassTable)
        .where(where)
        .orderBy(desc(workUnitClassTable.createdAt), asc(workUnitClassTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(workUnitClassTable.id) })
        .from(workUnitClassTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<WorkUnitClass | undefined> {
    return await this.db.query.workUnitClassTable.findFirst({
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
    const row = await this.db.query.workUnitClassTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }
}

class WorkUnitClassWriterRepository implements WorkUnitClassWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: WorkUnitClassWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(workUnitClass: CreateWorkUnitClass): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(workUnitClassTable)
        .values({
          code: workUnitClass.code,
          name: workUnitClass.name,
          region: this.region,
        })
        .returning({
          id: workUnitClassTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof UniqueViolationError) {
        throw new DuplicateWorkUnitClassError(workUnitClass.code);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateWorkUnitClass): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(workUnitClassTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(workUnitClassTable.id, id), eq(workUnitClassTable.region, this.region)))
        .returning({
          id: workUnitClassTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof UniqueViolationError) {
        throw new DuplicateWorkUnitClassError(patch.code);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(workUnitClassTable)
      .where(and(eq(workUnitClassTable.id, id), eq(workUnitClassTable.region, this.region)));
  }
}

export { WorkUnitClassReaderRepository, WorkUnitClassWriterRepository };
export type {
  WorkUnitClassReaderDeps,
  WorkUnitClassWriterDeps,
  WorkUnitClassReader,
  WorkUnitClassWriter,
};
