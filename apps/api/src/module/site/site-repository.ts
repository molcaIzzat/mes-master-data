import { and, count, eq, ilike, or } from "drizzle-orm";

import { DuplicateSiteError } from "./site-errors.js";
import { isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { siteTable } from "../../shared/database/schema/schema.js";

import type { CreateSite, Site, ListSiteInput, PagedSite, UpdateSite } from "./site.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type SiteReaderDeps = {
  db: PostgresDB;
  region: string;
};

type SiteWriterDeps = {
  db: PostgresDB;
  region: string;
};

type SiteReader = {
  findAll: (input: ListSiteInput) => Promise<PagedSite>;
  findById: (id: number) => Promise<Site | undefined>;
  existById: (id: number) => Promise<boolean>;
};

type SiteWriter = {
  create: (site: CreateSite) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateSite) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class SiteReaderRepository implements SiteReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: SiteReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListSiteInput): Promise<PagedSite> {
    const baseConds = [eq(siteTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(siteTable.name, pattern), ilike(siteTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.siteTable.findMany({
        where: {
          region: this.region,
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
          timezone: true,
          enterpriseId: true,
          region: true,
          createdAt: true,
        },
      }),
      this.db
        .select({ value: count(siteTable.id) })
        .from(siteTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Site | undefined> {
    return await this.db.query.siteTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        timezone: true,
        region: true,
        enterpriseId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.siteTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }
}

class SiteWriterRepository implements SiteWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: SiteWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(site: CreateSite): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(siteTable)
        .values({
          code: site.code,
          name: site.name,
          timezone: site.timezone,
          region: this.region,
        })
        .returning({
          id: siteTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateSiteError(site.code);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateSite): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(siteTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(siteTable.id, id), eq(siteTable.region, this.region)))
        .returning({
          id: siteTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateSiteError(patch.code);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(siteTable)
      .where(and(eq(siteTable.id, id), eq(siteTable.region, this.region)));
  }
}

export { SiteReaderRepository, SiteWriterRepository };
export type { SiteReaderDeps, SiteWriterDeps, SiteReader, SiteWriter };
