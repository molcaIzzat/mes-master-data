import { and, count, eq, ilike, inArray, or } from "drizzle-orm";

import {
  DuplicateProductError,
  InvalidProductAreaIdReferenceError,
  InvalidProductLineIdReferenceError,
} from "./product-errors.js";
import {
  productConvertionTable,
  productPackagingTable,
  productTable,
  pvProductLineTable,
} from "../../shared/database/schema/schema.js";

import type {
  CreateProduct,
  ListProductInput,
  PagedProduct,
  Product,
  ProductConvertion,
  ProductList,
  ProductPackage,
  UpdateProduct,
} from "./product.js";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";

type OneProduct = Omit<Product, "lines"> & {
  lines: {
    id: number;
    line: {
      id: number;
      name: string;
    } | null;
  }[];
};

type ProductShapeIn = Omit<CreateProduct, "lineIds" | "packages" | "convertions">;

type UpdateProductShapeIn = Partial<ProductShapeIn>;

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
  update: (id: number, patch: UpdateProduct) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
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
            with: {
              line: {
                columns: { id: true, name: true },
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
        id: l.line?.id ?? 0,
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
          with: {
            line: {
              columns: { id: true, name: true },
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

  private diffByKey<T>(
    next: T[],
    existing: T[],
    key: (item: T) => unknown,
  ): { toAdd: T[]; toRemove: T[] } {
    const existingKeys = new Set(existing.map(key));
    const nextKeys = new Set(next.map(key));
    return {
      toAdd: next.filter((r) => !existingKeys.has(key(r))),
      toRemove: existing.filter((r) => !nextKeys.has(key(r))),
    };
  }

  private async findAllLineId(productId: number): Promise<number[]> {
    const rows = await this.db.query.pvProductLineTable.findMany({
      where: { region: this.region, productId },
      columns: { lineId: true },
    });
    return rows.map((line) => line.lineId);
  }

  private async fincAllConvertion(
    productId: number,
  ): Promise<(ProductConvertion & { id: number })[]> {
    const rows = await this.db.query.productConvertionTable.findMany({
      where: { region: this.region, productId },
      columns: {
        id: true,
        unit: true,
        value: true,
        sortOrder: true,
      },
    });

    return rows.map((conv) => ({
      id: conv.id,
      unit: conv.unit,
      value: Number(conv.value),
      sortOrder: conv.sortOrder,
    }));
  }

  private async findAllPackage(productId: number): Promise<(ProductPackage & { id: number })[]> {
    const rows = await this.db.query.productPackagingTable.findMany({
      where: { region: this.region, productId },
      columns: {
        id: true,
        main: true,
        sortOrder: true,
        package: true,
        stdWeight: true,
        minWeight: true,
        maxWeight: true,
        length: true,
        height: true,
        width: true,
        vol: true,
      },
    });

    return rows.map((p) => ({
      id: p.id,
      main: p.main,
      sortOrder: p.sortOrder,
      length: Number(p.length),
      height: Number(p.height),
      minWeight: Number(p.minWeight),
      package: p.package,
      stdWeight: Number(p.stdWeight),
      maxWeight: Number(p.maxWeight),
      width: Number(p.width),
      vol: Number(p.vol),
    }));
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

  private async updateProduct(
    tx: Transaction,
    productId: number,
    patch: UpdateProductShapeIn,
  ): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .update(productTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(productTable.region, this.region), eq(productTable.id, productId)))
        .returning({
          id: productTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateProductError(patch.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidProductAreaIdReferenceError(patch.areaId);
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
      if (isForeignKeyViolation(err)) {
        throw new InvalidProductLineIdReferenceError();
      }
      throw err;
    }
  }

  private async updateProductLines(
    tx: Transaction,
    productId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (lineId) => lineId);
    try {
      if (toRemove.length > 0) {
        await tx
          .delete(pvProductLineTable)
          .where(
            and(
              eq(pvProductLineTable.region, this.region),
              eq(pvProductLineTable.productId, productId),
              inArray(pvProductLineTable.lineId, toRemove),
            ),
          );
      }

      if (toAdd.length > 0) {
        await tx.insert(pvProductLineTable).values(
          toAdd.map((lineId) => ({
            region: this.region,
            productId,
            lineId,
          })),
        );
      }
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new InvalidProductLineIdReferenceError();
      }
      throw err;
    }
  }

  private async insertProductPackages(
    tx: Transaction,
    productId: number,
    packages: ProductPackage[],
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

  private async updateProductPackages(
    tx: Transaction,
    productId: number,
    next: (ProductPackage & { id: number })[],
    existing: (ProductPackage & { id: number })[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (pac) => pac.id);
    console.log("package", { toAdd, toRemove });
    if (toRemove.length > 0) {
      await tx.delete(productPackagingTable).where(
        and(
          eq(productPackagingTable.region, this.region),
          eq(productPackagingTable.productId, productId),
          inArray(
            productPackagingTable.id,
            toRemove.map((pac) => pac.id),
          ),
        ),
      );
    }

    if (toAdd.length > 0) {
      await tx.insert(productPackagingTable).values(
        toAdd.map((p) => ({
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
  }

  private async insertProductConvertions(
    tx: Transaction,
    productId: number,
    convertions: ProductConvertion[],
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

  private async updateProductConvertion(
    tx: Transaction,
    productId: number,
    next: (ProductConvertion & { id: number })[],
    existing: (ProductConvertion & { id: number })[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (conv) => conv.id);
    console.log("convertions", { toAdd, toRemove });
    if (toRemove.length > 0) {
      await tx.delete(productConvertionTable).where(
        and(
          eq(productConvertionTable.region, this.region),
          eq(productConvertionTable.productId, productId),
          inArray(
            productConvertionTable.id,
            toRemove.map((conv) => conv.id),
          ),
        ),
      );
    }

    if (toAdd.length > 0) {
      await tx.insert(productConvertionTable).values(
        toAdd.map((c) => ({
          productId,
          region: this.region,
          unit: c.unit,
          sortOrder: c.sortOrder,
          value: String(c.value),
        })),
      );
    }
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

  async update(id: number, patch: UpdateProduct): Promise<{ id: number }> {
    const product = await this.db.transaction(async (tx) => {
      const {
        lineIds: nextLineIds,
        packages: nextPackages,
        convertions: nextConvertions,
        ...productShape
      } = patch;
      const save = await this.updateProduct(tx, id, productShape);
      if (nextLineIds) {
        const existingLineIds = await this.findAllLineId(save.id);
        await this.updateProductLines(tx, save.id, nextLineIds, existingLineIds);
      }

      if (nextPackages) {
        const existingPackages = await this.findAllPackage(save.id);
        await this.updateProductPackages(tx, save.id, nextPackages, existingPackages);
      }

      if (nextConvertions) {
        const existingConvertions = await this.fincAllConvertion(save.id);
        await this.updateProductConvertion(tx, save.id, nextConvertions, existingConvertions);
      }

      return save;
    });

    return product;
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(productTable)
      .where(and(eq(productTable.region, this.region), eq(productTable.id, id)));
  }
}

export { ProductReaderRepository, ProductWriterRepository };
export type { ProductReaderDeps, ProductReader, ProductWriterDeps, ProductWriter };
