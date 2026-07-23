import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateProductAlias,
  ProductAlias,
  ProductAliasList,
  UpdateProductAlias,
} from "./product-alias.js";
import type { ProductAliasReader, ProductAliasWriter } from "./product-alias-repository.js";

type PagedProductAliasResult = PagedResult<ProductAliasList>;

type ProductAliasServiceDeps = {
  productAliasReaderRepository: ProductAliasReader;
  productAliasWriterRepository: ProductAliasWriter;
  logger?: Logger;
};

type TProductAliasService = {
  findManyByWorkUnitId: (
    workUnitId: number,
    page: number,
    size: number,
  ) => Promise<PagedProductAliasResult>;
  findById: (id: number) => Promise<ProductAlias>;
  create: (input: CreateProductAlias) => Promise<{ id: number }>;
  update: (id: number, input: UpdateProductAlias) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class ProductAliasService implements TProductAliasService {
  private productAliasReaderRepository: ProductAliasReader;
  private productAliasWriterRepository: ProductAliasWriter;
  private fallbackLogger: Logger;

  constructor({
    productAliasReaderRepository,
    productAliasWriterRepository,
    logger,
  }: ProductAliasServiceDeps) {
    this.productAliasReaderRepository = productAliasReaderRepository;
    this.productAliasWriterRepository = productAliasWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    page: number,
    size: number,
  ): Promise<PagedProductAliasResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.productAliasReaderRepository.findManyByWorkUnitId(
      workUnitId,
      {
        limit,
        offset,
      },
    );

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<ProductAlias> {
    const found = await this.productAliasReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "alias not found" });
    return found;
  }

  async create(input: CreateProductAlias): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "product_alias_code_create",
      {
        input,
      },
      () => this.productAliasWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateProductAlias): Promise<{ id: number }> {
    const found = await this.productAliasReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "alias not found" });
    const save = await withLog(
      this.logger,
      "product_alias_code_update",
      {
        id,
        input,
      },
      () => this.productAliasWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.productAliasReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "alias not found" });
    await withLog(
      this.logger,
      "product_alias_code_delete",
      {
        id,
      },
      () => this.productAliasWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { ProductAliasService };
export type { PagedProductAliasResult, TProductAliasService };
