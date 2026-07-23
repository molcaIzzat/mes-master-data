import { and, count, eq } from "drizzle-orm";

import { InvalidProductSpecReferenceError } from "./spec-errors.js";
import { FkViolationError, toPgConstraintError } from "../../shared/database/helper/catcher.js";
import { productWorkUnitSpecTable } from "../../shared/database/schema/schema.js";

import type {
  CreateProductSpec,
  ProductSpec,
  ListProductSpecInput,
  PagedProductSpec,
  UpdateProductSpec,
} from "./spec.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type ProductSpecReaderDeps = {
  db: PostgresDB;
  region: string;
};

type ProductSpecWriterDeps = {
  db: PostgresDB;
  region: string;
};

type ProductSpecReader = {
  findManyByWorkUnitId: (
    workUnitId: number,
    input: ListProductSpecInput,
  ) => Promise<PagedProductSpec>;
  findById: (id: number) => Promise<ProductSpec | undefined>;
};

type ProductSpecWriter = {
  create: (input: CreateProductSpec) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateProductSpec) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class ProductSpecReaderRepository implements ProductSpecReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductSpecReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    { limit, offset }: ListProductSpecInput,
  ): Promise<PagedProductSpec> {
    const baseConds = [
      eq(productWorkUnitSpecTable.region, this.region),
      eq(productWorkUnitSpecTable.workUnitId, workUnitId),
    ];

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.productWorkUnitSpecTable.findMany({
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
          idealRatePerHour: true,
        },
        with: {
          product: {
            columns: { id: true, code: true, name: true },
          },
          uom: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(productWorkUnitSpecTable.id) })
        .from(productWorkUnitSpecTable)
        .where(where),
    ]);

    const items = rows.map((spec) => ({
      ...spec,
      idealRatePerHour: Number(spec.idealRatePerHour),
    }));

    return { items, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<ProductSpec | undefined> {
    const row = await this.db.query.productWorkUnitSpecTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        workUnitId: true,
        idealRatePerHour: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        product: {
          columns: { id: true, code: true, name: true },
        },
        uom: {
          columns: { id: true, code: true, name: true },
        },
      },
    });

    if (!row) return undefined;
    return {
      ...row,
      idealRatePerHour: Number(row.idealRatePerHour),
    };
  }
}

class ProductSpecWriterRepository implements ProductSpecWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductSpecWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(input: CreateProductSpec): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(productWorkUnitSpecTable)
        .values({
          productId: input.productId,
          workUnitId: input.workUnitId,
          uomId: input.uomId,
          idealRatePerHour: input.idealRatePerHour,
          region: this.region,
        })
        .returning({
          id: productWorkUnitSpecTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidProductSpecReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateProductSpec): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(productWorkUnitSpecTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productWorkUnitSpecTable.id, id),
            eq(productWorkUnitSpecTable.region, this.region),
          ),
        )
        .returning({
          id: productWorkUnitSpecTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidProductSpecReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(productWorkUnitSpecTable)
      .where(
        and(eq(productWorkUnitSpecTable.id, id), eq(productWorkUnitSpecTable.region, this.region)),
      );
  }
}

export { ProductSpecReaderRepository, ProductSpecWriterRepository };
export type { ProductSpecReaderDeps, ProductSpecWriterDeps, ProductSpecReader, ProductSpecWriter };
