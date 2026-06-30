import { and, count, eq, ilike, or } from "drizzle-orm";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";
import type {
  CreateProduct,
  ListProductInput,
  PagedProduct,
  Product,
  ProductList,
  UpdateProduct,
} from "./product.js";
import {
  productConvertionTable,
  productPackagingTable,
  productTable,
  pvProductLineTable,
} from "../../shared/database/schema/schema.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { DuplicateProductError, InvalidProductAreaIdReferenceError } from "./product-errors.js";

type OneProduct = Omit<Product, "lines"> & {
  lines: {
    id: number;
    line: {
      name: string;
    } | null;
  }[];
};

type ProductShapeIn = Omit<CreateProduct, "lineIds" | "packages" | "convertions">;

type ProductPackageIn = Pick<CreateProduct, "packages">["packages"];

type ProductConvertionIn = Pick<CreateProduct, "convertions">["convertions"];

type ProductReaderDeps = {
  db: PostgresDB;
  region: string;
};

type ProductWriterDeps = {
  db: PostgresDB;
  region: string;
};

type ProductReader = {
  findAll: (input: ListProductInput) => Promise<PagedProduct>;
  findById: (id: number) => Promise<OneProduct | undefined>;
};

type ProductWriter = {
  create: (input: CreateProduct) => Promise<{ id: number }>;
  // update: (id: number, patch: UpdateProduct) => Promise<{ id: number }>
};

class ProductReaderRepository implements ProductReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListProductInput): Promise<PagedProduct> {
    const baseConds = [eq(productTable.region, this.region)];

    if (filter.areaId !== undefined) baseConds.push(eq(productTable.areaId, filter.areaId));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(productTable.name, pattern), ilike(productTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.productTable.findMany({
        where: {
          region: this.region,
          ...(filter.areaId !== undefined ? { areaId: filter.areaId } : {}),
          ...(filter.q !== undefined
            ? {
                OR: [{ name: { ilike: `%${filter.q}%` } }, { code: { ilike: `%${filter.q}%` } }],
              }
            : {}),
        },
        orderBy: (p, { desc, asc }) => [desc(p.createdAt), asc(p.id)],
        limit,
        offset,
        columns: {
          id: true,
          code: true,
          name: true,
          region: true,
        },
        with: {
          area: {
            where: { region: this.region },
            columns: { id: true, displayName: true },
          },
          lines: {
            where: { region: this.region },
            columns: { id: true },
            with: {
              line: {
                columns: { name: true },
              },
            },
          },
        },
      }),
      this.db
        .select({ value: count(productTable.id) })
        .from(productTable)
        .where(where),
    ]);

    const items: ProductList[] = rows.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      region: product.region,
      area: product.area,
      lines: product.lines.map((l) => ({
        id: l.id,
        lineName: l.line?.name ?? "",
      })),
    }));

    return { items, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<OneProduct | undefined> {
    return await this.db.query.productTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        region: true,
        cycleTime: true,
        cycleTimeUnit: true,
        price: true,
        cost: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        area: {
          where: { region: this.region },
          columns: {
            id: true,
            displayName: true,
          },
        },
        lines: {
          where: { region: this.region },
          columns: { id: true },
          with: {
            line: {
              columns: { name: true },
            },
          },
        },
        packages: {
          where: { region: this.region },
          columns: {
            id: true,
            main: true,
            package: true,
            stdWeight: true,
            minWeight: true,
            maxWeight: true,
          },
          orderBy: (p, { asc }) => [asc(p.sortOrder)],
        },
        convertions: {
          where: { region: this.region },
          columns: {
            id: true,
            value: true,
            unit: true,
          },
          orderBy: (c, { asc }) => [asc(c.sortOrder)],
        },
      },
    });
  }
}

class ProductWriterRepository implements ProductWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductReaderDeps) {
    this.db = db;
    this.region = region;
  }

  private async insertProduct(tx: Transaction, product: ProductShapeIn): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .insert(productTable)
        .values({
          code: product.code,
          name: product.name,
          areaId: product.areaId,
          cycleTime: product.cycleTime,
          cycleTimeUnit: product.cycleTimeUnit,
          cost: product.cost,
          price: product.price,
          region: this.region,
        })
        .returning({
          id: productTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateProductError(product.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidProductAreaIdReferenceError(product.areaId);
      }
      throw err;
    }
  }

  private async insertProductLines(
    tx: Transaction,
    productId: number,
    lineIds: number[],
  ): Promise<void> {
    if (lineIds.length === 0) return;
    try {
      await tx.insert(pvProductLineTable).values(
        lineIds.map((l) => ({
          region: this.region,
          productId,
          lineId: l,
        })),
      );
    } catch (err) {
      throw err;
    }
  }

  private async insertProductPackages(
    tx: Transaction,
    productId: number,
    packages: ProductPackageIn,
  ): Promise<void> {
    if (packages.length === 0) return;
    await tx.insert(productPackagingTable).values(
      packages.map((p) => ({
        productId,
        sortOrder: p.sortOrder,
        package: p.package,
        main: p.main,
        region: this.region,
        stdWeight: String(p.stdWeight),
        minWeight: String(p.minWeight),
        maxWeight: String(p.maxWeight),
        length: String(p.length),
        width: String(p.width),
        height: String(p.height),
        vol: String(p.vol),
      })),
    );
  }

  private async insertProductConvertions(
    tx: Transaction,
    productId: number,
    convertions: ProductConvertionIn,
  ): Promise<void> {
    await tx.insert(productConvertionTable).values(
      convertions.map((c) => ({
        productId,
        region: this.region,
        unit: c.unit,
        sortOrder: c.sortOrder,
        value: String(c.value),
      })),
    );
  }

  async create(input: CreateProduct): Promise<{ id: number }> {
    const product = await this.db.transaction(async (tx) => {
      const { lineIds, packages, convertions, ...productShape } = input;
      const save = await this.insertProduct(tx, productShape);
      await this.insertProductLines(tx, save.id, lineIds);
      await this.insertProductPackages(tx, save.id, packages);
      await this.insertProductConvertions(tx, save.id, convertions);

      return save;
    });

    return product;
  }

  // async update(id: number, patch: UpdateProduct): Promise<{ id: number }> {
  //
  // }
}

export { ProductReaderRepository, ProductWriterRepository };
export type { ProductReaderDeps, ProductReader, ProductWriterDeps, ProductWriter };
