import { and, eq } from "drizzle-orm";

import { toFormatString, type UpdateProductConvertion } from "./product-convertion.js";
import { productConvertionTable } from "../../shared/database/schema/schema.js";

import type { PostgresDB } from "../../shared/database/postgres.js";

type ProductConvertionWriterDeps = {
  db: PostgresDB;
  region: string;
};

type ProductConvertionReaderDeps = {
  db: PostgresDB;
  region: string;
};

type ProductConvertionReader = {
  existById: (id: number) => Promise<boolean>;
};

type ProductConvertionWriter = {
  update: (id: number, patch: UpdateProductConvertion) => Promise<{ id: number }>;
};

class ProductConvertionReaderRepository implements ProductConvertionReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductConvertionReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async existById(id: number): Promise<boolean> {
    const found = await this.db.query.productConvertionTable.findFirst({
      where: { region: this.region, id },
    });
    return !!found;
  }
}

class ProductConvertionWriterRepository implements ProductConvertionWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductConvertionWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async update(id: number, patch: UpdateProductConvertion): Promise<{ id: number }> {
    const [row] = await this.db
      .update(productConvertionTable)
      .set({
        ...toFormatString(patch),
        updatedAt: new Date(),
      })
      .where(and(eq(productConvertionTable.id, id), eq(productConvertionTable.region, this.region)))
      .returning({
        id: productConvertionTable.id,
      });

    return row;
  }
}

export { ProductConvertionWriterRepository, ProductConvertionReaderRepository };
export type {
  ProductConvertionWriter,
  ProductConvertionWriterDeps,
  ProductConvertionReader,
  ProductConvertionReaderDeps,
};
