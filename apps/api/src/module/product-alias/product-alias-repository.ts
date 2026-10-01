import { and, count, eq } from "drizzle-orm";

import { InvalidProductAliasReferenceError } from "./product-alias-errors.js";
import { FkViolationError, toPgConstraintError } from "../../shared/database/helper/catcher.js";
import { productCodeAliasTable } from "../../shared/database/schema/schema.js";

import type {
  CreateProductAlias,
  ProductAlias,
  ListProductAliasInput,
  PagedProductAlias,
  UpdateProductAlias,
} from "./product-alias.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type ProductAliasReaderDeps = {
  db: PostgresDB;
  region: string;
};

type ProductAliasWriterDeps = {
  db: PostgresDB;
  region: string;
};

type ProductAliasReader = {
  findManyByWorkUnitId: (
    workUnitId: number,
    input: ListProductAliasInput,
  ) => Promise<PagedProductAlias>;
  findById: (id: number) => Promise<ProductAlias | undefined>;
};

type ProductAliasWriter = {
  create: (input: CreateProductAlias) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateProductAlias) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class ProductAliasReaderRepository implements ProductAliasReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductAliasReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    { limit, offset }: ListProductAliasInput,
  ): Promise<PagedProductAlias> {
    const baseConds = [
      eq(productCodeAliasTable.region, this.region),
      eq(productCodeAliasTable.workUnitId, workUnitId),
    ];

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.productCodeAliasTable.findMany({
        where: {
          region: this.region,
          workUnitId,
        },
        orderBy: (wu, { desc, asc }) => [desc(wu.createdAt), asc(wu.id)],
        limit,
        offset,
        columns: {
          id: true,
          workUnitId: true,
          externalCode: true,
        },
        with: {
          product: {
            columns: { id: true, code: true, name: true },
          },
          equipment: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(productCodeAliasTable.id) })
        .from(productCodeAliasTable)
        .where(where),
    ]);

    const items = rows.map((alias) => ({
      ...alias,
      externalCode: alias.externalCode,
    }));

    return { items, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<ProductAlias | undefined> {
    const row = await this.db.query.productCodeAliasTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        workUnitId: true,
        externalCode: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        product: {
          columns: { id: true, code: true, name: true },
        },
        equipment: {
          columns: { id: true, code: true, name: true },
        },
      },
    });

    if (!row) return undefined;
    return {
      ...row,
      externalCode: row.externalCode,
    };
  }
}

class ProductAliasWriterRepository implements ProductAliasWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductAliasWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(input: CreateProductAlias): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(productCodeAliasTable)
        .values({
          productId: input.productId,
          workUnitId: input.workUnitId,
          equipmentId: input.equipmentId,
          externalCode: input.externalCode,
          region: this.region,
        })
        .returning({
          id: productCodeAliasTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidProductAliasReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateProductAlias): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(productCodeAliasTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(productCodeAliasTable.id, id), eq(productCodeAliasTable.region, this.region)))
        .returning({
          id: productCodeAliasTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidProductAliasReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(productCodeAliasTable)
      .where(and(eq(productCodeAliasTable.id, id), eq(productCodeAliasTable.region, this.region)));
  }
}

export { ProductAliasReaderRepository, ProductAliasWriterRepository };
export type {
  ProductAliasReaderDeps,
  ProductAliasWriterDeps,
  ProductAliasReader,
  ProductAliasWriter,
};
