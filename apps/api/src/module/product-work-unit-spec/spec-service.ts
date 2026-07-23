import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { CreateProductSpec, ProductSpec, ProductSpecList, UpdateProductSpec } from "./spec.js";
import type { ProductSpecReader, ProductSpecWriter } from "./spec-repository.js";

type PagedProductSpecResult = PagedResult<ProductSpecList>;

type ProductSpecServiceDeps = {
  productSpecReaderRepository: ProductSpecReader;
  productSpecWriterRepository: ProductSpecWriter;
  logger?: Logger;
};

type TProductSpecService = {
  findManyByWorkUnitId: (
    workUnitId: number,
    page: number,
    size: number,
  ) => Promise<PagedProductSpecResult>;
  findById: (id: number) => Promise<ProductSpec>;
  create: (input: CreateProductSpec) => Promise<{ id: number }>;
  update: (id: number, input: UpdateProductSpec) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class ProductSpecService implements TProductSpecService {
  private productSpecReaderRepository: ProductSpecReader;
  private productSpecWriterRepository: ProductSpecWriter;
  private fallbackLogger: Logger;

  constructor({
    productSpecReaderRepository,
    productSpecWriterRepository,
    logger,
  }: ProductSpecServiceDeps) {
    this.productSpecReaderRepository = productSpecReaderRepository;
    this.productSpecWriterRepository = productSpecWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    page: number,
    size: number,
  ): Promise<PagedProductSpecResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.productSpecReaderRepository.findManyByWorkUnitId(
      workUnitId,
      {
        limit,
        offset,
      },
    );

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<ProductSpec> {
    const found = await this.productSpecReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "spec not found" });
    return found;
  }

  async create(input: CreateProductSpec): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "product_spec_create",
      {
        input,
      },
      () => this.productSpecWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateProductSpec): Promise<{ id: number }> {
    const found = await this.productSpecReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "spec not found" });
    const save = await withLog(
      this.logger,
      "product_spec_update",
      {
        id,
        input,
      },
      () => this.productSpecWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.productSpecReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "spec not found" });
    await withLog(
      this.logger,
      "product_spec_delete",
      {
        id,
      },
      () => this.productSpecWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { ProductSpecService };
export type { PagedProductSpecResult, TProductSpecService };
