import { buildPageMeta, type PagedResult } from "@molca/network";
import type { CreateProduct, Product, ProductFilter, ProductList } from "./product.js";
import type { ProductReader, ProductWriter } from "./product-repository.js";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";
import { HTTPException } from "hono/http-exception";

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
        id: l.id,
        lineName: l.line?.name ?? "",
      })),
    };
  }

  async create(input: CreateProduct): Promise<{ id: number }> {
    return await withLog(this.logger, "product_create", { input }, () =>
      this.productWriterRepository.create(input),
    );
  }
}

export { ProductService };
export type { ProductServiceDeps, TProductService };
