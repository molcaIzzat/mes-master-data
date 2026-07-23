import { type UpdateProductConvertion } from "./product-convertion.js";

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

  async existById(_id: number): Promise<boolean> {
    return false;
  }
}

class ProductConvertionWriterRepository implements ProductConvertionWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: ProductConvertionWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async update(_id: number, _patch: UpdateProductConvertion): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS AN AVAILABLE");
  }
}

export { ProductConvertionWriterRepository, ProductConvertionReaderRepository };
export type {
  ProductConvertionWriter,
  ProductConvertionWriterDeps,
  ProductConvertionReader,
  ProductConvertionReaderDeps,
};
