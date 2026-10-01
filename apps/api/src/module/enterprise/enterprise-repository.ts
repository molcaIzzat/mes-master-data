import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { enterpriseTable } from "../../shared/database/schema/schema.js";

import type {
  Enterprise,
  CreateEnterprise,
  ListEnterpriseInput,
  PagedEnterprise,
  UpdateEnterprise,
} from "./enterprise.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { DuplicateEnterpriseError } from "./enterprise-errors.js";
import type { EnterpriseSummary } from "@molca/contract-client";

type EnterpriseReaderDeps = {
  db: PostgresDB;
  region: string;
};

type EnterpriseWriterDeps = {
  db: PostgresDB;
  region: string;
};

type EnterpriseReader = {
  findAll: (input: ListEnterpriseInput) => Promise<PagedEnterprise>;
  findById: (id: number) => Promise<Enterprise | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<EnterpriseSummary[]>;
};

type EnterpriseWriter = {
  create: (enterprise: CreateEnterprise) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateEnterprise) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class EnterpriseReaderRepository implements EnterpriseReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EnterpriseReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListEnterpriseInput): Promise<PagedEnterprise> {
    const baseConds = [eq(enterpriseTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(enterpriseTable.name, pattern), ilike(enterpriseTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: enterpriseTable.id,
          code: enterpriseTable.code,
          name: enterpriseTable.name,
          region: enterpriseTable.region,
          createdAt: enterpriseTable.createdAt,
          updatedAt: enterpriseTable.updatedAt,
        })
        .from(enterpriseTable)
        .where(where)
        .orderBy(desc(enterpriseTable.createdAt), asc(enterpriseTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(enterpriseTable.id) })
        .from(enterpriseTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Enterprise | undefined> {
    return await this.db.query.enterpriseTable.findFirst({
      where: { id, region: this.region },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.enterpriseTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }

  async findSummariesByIds(ids: number[]): Promise<EnterpriseSummary[]> {
    return await this.db.query.enterpriseTable.findMany({
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

class EnterpriseWriterRepository implements EnterpriseWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EnterpriseWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(enterprise: CreateEnterprise): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(enterpriseTable)
        .values({
          name: enterprise.name,
          code: enterprise.code,
          region: this.region,
        })
        .returning({
          id: enterpriseTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateEnterpriseError(enterprise.code);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateEnterprise): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(enterpriseTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(enterpriseTable.id, id), eq(enterpriseTable.region, this.region)))
        .returning({
          id: enterpriseTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateEnterpriseError(patch.code);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(enterpriseTable)
      .where(and(eq(enterpriseTable.id, id), eq(enterpriseTable.region, this.region)));
  }
}

export { EnterpriseReaderRepository, EnterpriseWriterRepository };
export type { EnterpriseReaderDeps, EnterpriseWriterDeps, EnterpriseReader, EnterpriseWriter };
