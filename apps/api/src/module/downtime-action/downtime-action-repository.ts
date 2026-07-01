import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { DuplicateDowntimeActionError } from "./downtime-action-errors.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { downtimeActionTable } from "../../shared/database/schema/schema.js";

import type {
  CreateDowntimeAction,
  DowntimeAction,
  ListDowntimeActionInput,
  PagedDowntimeAction,
  UpdateDowntimeAction,
} from "./downtime-action.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type DowntimeActionReaderDeps = {
  db: PostgresDB;
  region: string;
};

type DowntimeActionWriterDeps = {
  db: PostgresDB;
  region: string;
};

type DowntimeActionReader = {
  findAll: (input: ListDowntimeActionInput) => Promise<PagedDowntimeAction>;
  findById: (id: number) => Promise<DowntimeAction | undefined>;
};

type DowntimeActionWriter = {
  create: (input: CreateDowntimeAction) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateDowntimeAction) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class DowntimeActionReaderRepository implements DowntimeActionReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: DowntimeActionReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListDowntimeActionInput): Promise<PagedDowntimeAction> {
    const baseConds = [eq(downtimeActionTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(downtimeActionTable.name, pattern),
        ilike(downtimeActionTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: downtimeActionTable.id,
          code: downtimeActionTable.code,
          name: downtimeActionTable.name,
          color: downtimeActionTable.color,
          region: downtimeActionTable.region,
          createdAt: downtimeActionTable.createdAt,
          updatedAt: downtimeActionTable.updatedAt,
        })
        .from(downtimeActionTable)
        .where(where)
        .orderBy(desc(downtimeActionTable.createdAt), asc(downtimeActionTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(downtimeActionTable.id) })
        .from(downtimeActionTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<DowntimeAction | undefined> {
    return await this.db.query.downtimeActionTable.findFirst({
      where: { id, region: this.region },
    });
  }
}

class DowntimeActionWriterRepository implements DowntimeActionWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: DowntimeActionWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(input: CreateDowntimeAction): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(downtimeActionTable)
        .values({
          code: input.code,
          name: input.name,
          color: input.color,
          region: this.region,
        })
        .returning({
          id: downtimeActionTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateDowntimeActionError(input.code);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateDowntimeAction): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(downtimeActionTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(downtimeActionTable.id, id), eq(downtimeActionTable.region, this.region)))
        .returning({
          id: downtimeActionTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateDowntimeActionError(patch.code);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(downtimeActionTable)
      .where(and(eq(downtimeActionTable.id, id), eq(downtimeActionTable.region, this.region)));
  }
}

export { DowntimeActionReaderRepository, DowntimeActionWriterRepository };
export type {
  DowntimeActionReaderDeps,
  DowntimeActionWriterDeps,
  DowntimeActionReader,
  DowntimeActionWriter,
};
