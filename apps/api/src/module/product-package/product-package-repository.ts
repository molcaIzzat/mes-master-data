import { and, eq } from "drizzle-orm";

import { toFormatString, type UpdateProductPackage } from "./product-package.js";
import { productPackagingTable } from "../../shared/database/schema/schema.js";

import type { PostgresDB } from "../../shared/database/postgres.js";

type ProductPackageWriterDeps = {
  db: PostgresDB;
  region: string;
};

type ProductPackageReaderDeps = {
  db: PostgresDB;
  region: string;
};

type ProductPackageReader = {
  existById: (id: number) => Promise<boolean>;
};

type ProductPackageWriter = {
  update: (id: number, patch: UpdateProductPackage) => Promise<{ id: number }>;
};

class ProductPackageReaderRepository implements ProductPackageReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductPackageReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async existById(id: number): Promise<boolean> {
    const found = await this.db.query.productPackagingTable.findFirst({
      where: { region: this.region, id },
    });
    return !!found;
  }
}

class ProductPackageWriterRepository implements ProductPackageWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductPackageWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async update(id: number, patch: UpdateProductPackage): Promise<{ id: number }> {
    const [row] = await this.db
      .update(productPackagingTable)
      .set({
        ...toFormatString(patch),
        updatedAt: new Date(),
      })
      .where(and(eq(productPackagingTable.id, id), eq(productPackagingTable.region, this.region)))
      .returning({
        id: productPackagingTable.id,
      });

    return row;
  }
}

export { ProductPackageWriterRepository, ProductPackageReaderRepository };
export type {
  ProductPackageWriter,
  ProductPackageWriterDeps,
  ProductPackageReader,
  ProductPackageReaderDeps,
};
