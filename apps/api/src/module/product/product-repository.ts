import { and, count, eq, ilike, inArray, or } from "drizzle-orm";

import {
  DuplicateProductError,
  InvalidProductAreaIdReferenceError,
  InvalidProductLineIdReferenceError,
} from "./product-errors.js";
import {
  productPackagingTable,
  productTable,
  productWorkCenterTable,
} from "../../shared/database/schema/schema.js";

import type {
  CreateProduct,
  ListProductInput,
  PagedProduct,
  Product,
  ProductList,
  ProductPackage,
  UpdateProduct,
} from "./product.js";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";

type OneProduct = Omit<Product, "workCenters"> & {
  workCenters: {
    id: number;
    workCenterId: number;
    workCenter: {
      name: string;
    } | null;
  }[];
};

type ProductShapeIn = Omit<CreateProduct, "workCenterIds" | "packages" | "convertions">;

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
            columns: { id: true, code: true, name: true },
          },
          baseUom: {
            columns: { id: true, code: true, name: true },
          },
          workCenters: {
            columns: { workCenterId: true },
            with: {
              workCenter: {
                columns: { id: true, code: true, name: true },
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
      workCenters: product.workCenters.map((wc) => ({
        id: wc.workCenterId,
        name: wc.workCenter?.name ?? "",
      })),
    }));

    return { items, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<OneProduct | undefined> {
    const row = await this.db.query.productTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        code: true,
        name: true,
        idealRatePerHour: true,
        price: true,
        cost: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        area: {
          columns: { id: true, code: true, name: true },
        },
        baseUom: {
          columns: { id: true, code: true, name: true },
        },
        workCenters: {
          columns: { id: true, workCenterId: true },
          with: {
            workCenter: {
              columns: { name: true },
            },
          },
        },
        packages: {
          columns: {
            id: true,
            main: true,
            sortOrder: true,
            stdWeight: true,
            minWeight: true,
            maxWeight: true,
            factorToBase: true,
          },
          with: {
            uom: {
              columns: { id: true, code: true, name: true },
            },
          },
          orderBy: (p, { asc }) => [asc(p.sortOrder)],
        },
      },
    });

    if (!row) return undefined;

    return {
      ...row,
      idealRatePerHour: Number(row.idealRatePerHour),
      price: Number(row.price),
      cost: Number(row.cost),
      packages: row.packages.map((pck) => ({
        ...pck,
        stdWeight: Number(pck.stdWeight),
        minWeight: Number(pck.minWeight),
        maxWeight: Number(pck.maxWeight),
        factorToBase: Number(pck.factorToBase),
      })),
    };
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

  private async findAllWorkCenterId(tx: Transaction, productId: number): Promise<number[]> {
    const rows = await tx.query.productWorkCenterTable.findMany({
      where: { region: this.region, productId },
      columns: { workCenterId: true },
    });
    return rows.map((pwc) => pwc.workCenterId);
  }

  private async findAllPackage(
    tx: Transaction,
    productId: number,
  ): Promise<(ProductPackage & { id: number })[]> {
    const rows = await tx.query.productPackagingTable.findMany({
      where: { region: this.region, productId },
      columns: {
        id: true,
        productId: true,
        uomId: true,
        main: true,
        sortOrder: true,
        stdWeight: true,
        minWeight: true,
        maxWeight: true,
        length: true,
        height: true,
        width: true,
        vol: true,
        factorToBase: true,
      },
    });

    return rows.map((p) => ({
      id: p.id,
      main: p.main,
      sortOrder: p.sortOrder,
      productId: p.productId,
      uomId: p.uomId,
      factorToBase: Number(p.factorToBase),
      length: Number(p.length),
      height: Number(p.height),
      minWeight: Number(p.minWeight),
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
          baseUomId: product.baseUomId,
          idealRatePerHour: String(product.idealRatePerHour),
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
          idealRatePerHour: patch.idealRatePerHour ? String(patch.idealRatePerHour) : undefined,
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

  private async insertProductWorkCenters(
    tx: Transaction,
    productId: number,
    workCenterIds: number[],
  ): Promise<void> {
    if (workCenterIds.length === 0) return;
    try {
      await tx.insert(productWorkCenterTable).values(
        workCenterIds.map((workCenterId) => ({
          region: this.region,
          productId,
          workCenterId,
        })),
      );
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new InvalidProductLineIdReferenceError();
      }
      throw err;
    }
  }

  private async updateProductWorkCenters(
    tx: Transaction,
    productId: number,
    next: number[],
    existing: number[],
  ): Promise<void> {
    const { toAdd, toRemove } = this.diffByKey(next, existing, (workCenterId) => workCenterId);
    try {
      if (toRemove.length > 0) {
        await tx
          .delete(productWorkCenterTable)
          .where(
            and(
              eq(productWorkCenterTable.region, this.region),
              eq(productWorkCenterTable.productId, productId),
              inArray(productWorkCenterTable.workCenterId, toRemove),
            ),
          );
      }

      if (toAdd.length > 0) {
        await tx.insert(productWorkCenterTable).values(
          toAdd.map((workCenterId) => ({
            region: this.region,
            productId,
            workCenterId,
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
        uomId: p.uomId,
        sortOrder: p.sortOrder,
        main: p.main,
        region: this.region,
        factorToBase: String(p.factorToBase),
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
    const existingIds = new Set(existing.map((pac) => pac.id));
    const nextIds = new Set(next.map((pac) => pac.id));

    const toRemove = existing.filter((pac) => !nextIds.has(pac.id));
    const toAdd = next.filter((pac) => !existingIds.has(pac.id));
    const toUpdate = next.filter((pac) => existingIds.has(pac.id));

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

    for (const p of toUpdate) {
      await tx
        .update(productPackagingTable)
        .set({
          uomId: p.uomId,
          sortOrder: p.sortOrder,
          main: p.main,
          factorToBase: String(p.factorToBase),
          stdWeight: String(p.stdWeight),
          minWeight: String(p.minWeight),
          maxWeight: String(p.maxWeight),
          length: String(p.length),
          width: String(p.width),
          height: String(p.height),
          vol: String(p.vol),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productPackagingTable.region, this.region),
            eq(productPackagingTable.productId, productId),
            eq(productPackagingTable.id, p.id),
          ),
        );
    }

    if (toAdd.length > 0) {
      await tx.insert(productPackagingTable).values(
        toAdd.map((p) => ({
          productId,
          uomId: p.uomId,
          sortOrder: p.sortOrder,
          factorToBase: String(p.factorToBase),
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

  async create(input: CreateProduct): Promise<{ id: number }> {
    const product = await this.db.transaction(async (tx) => {
      const { workCenterIds, packages, ...productShape } = input;
      const save = await this.insertProduct(tx, productShape);
      await this.insertProductWorkCenters(tx, save.id, workCenterIds);
      await this.insertProductPackages(tx, save.id, packages);

      return save;
    });

    return product;
  }

  async update(id: number, patch: UpdateProduct): Promise<{ id: number }> {
    const product = await this.db.transaction(async (tx) => {
      const { workCenterIds: nextWorkCenterIds, packages: nextPackages, ...productShape } = patch;
      const save = await this.updateProduct(tx, id, productShape);
      if (nextWorkCenterIds) {
        const existingLineIds = await this.findAllWorkCenterId(tx, save.id);
        await this.updateProductWorkCenters(tx, save.id, nextWorkCenterIds, existingLineIds);
      }

      if (nextPackages) {
        const existingPackages = await this.findAllPackage(tx, save.id);
        await this.updateProductPackages(tx, save.id, nextPackages, existingPackages);
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
