import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateProduct,
  Product,
  ProductFilter,
  ProductList,
  UpdateProduct,
} from "./product.js";
import type { ProductReader, ProductWriter } from "./product-repository.js";

type PagedProductResult = PagedResult<ProductList>;

type ProductServiceDeps = {
  productReaderRepository: ProductReader;
  productWriterRepository: ProductWriter;
  logger?: Logger;
};

type TProductService = {
  findAll: (page: number, size: number, filter: ProductFilter) => Promise<PagedProductResult>;
  findById: (id: number) => Promise<Product>;
  create: (input: CreateProduct) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateProduct) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class ProductService implements TProductService {
  private productReaderRepository: ProductReader;
  private productWriterRepository: ProductWriter;
  private fallbackLogger: Logger;

  constructor({ productReaderRepository, productWriterRepository, logger }: ProductServiceDeps) {
    this.productReaderRepository = productReaderRepository;
    this.productWriterRepository = productWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: ProductFilter): Promise<PagedProductResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.productReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Product> {
    const product = await this.productReaderRepository.findById(id);
    if (!product) throw new HTTPException(404, { message: "product not found" });
    return {
      id: product.id,
      code: product.code,
      name: product.name,
      region: product.region,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      cycleTime: product.cycleTime,
      cycleTimeUnit: product.cycleTimeUnit,
      price: product.price,
      cost: product.cost,
      area: product.area,
      packages: product.packages,
      convertions: product.convertions,
      lines: product.lines.map((l) => ({
        id: l.line?.id ?? 0,
        lineName: l.line?.name ?? "",
      })),
    };
  }

  async create(input: CreateProduct): Promise<{ id: number }> {
    return await withLog(this.logger, "product_create", { input }, () =>
      this.productWriterRepository.create(input),
    );
  }

  async update(id: number, patch: UpdateProduct): Promise<{ id: number }> {
    const found = await this.productReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "product not found" });
    return await withLog(this.logger, "product_update", { patch }, () =>
      this.productWriterRepository.update(id, patch),
    );
  }

  async delete(id: number): Promise<string> {
    const found = await this.productReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "product not found" });
    await withLog(this.logger, "product_delete", { id }, () =>
      this.productWriterRepository.delete(id),
    );
    return "ok";
  }
}

export { ProductService };
export type { ProductServiceDeps, TProductService };
