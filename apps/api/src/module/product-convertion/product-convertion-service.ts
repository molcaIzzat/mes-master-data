import { HTTPException } from "hono/http-exception";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  ProductConvertionReader,
  ProductConvertionWriter,
} from "./product-convertion-repository.js";
import type { UpdateProductConvertion } from "./product-convertion.js";

type ProductConvertionServiceDeps = {
  productConvertionWriterRepository: ProductConvertionWriter;
  productConvertionReaderRepository: ProductConvertionReader;
  logger?: Logger;
};

type TProductConvertionService = {
  update: (id: number, input: UpdateProductConvertion) => Promise<{ id: number }>;
};

class ProductConvertionService implements TProductConvertionService {
  private productConvertionWriterRepository: ProductConvertionWriter;
  private productConvertionReaderRepository: ProductConvertionReader;
  private fallbackLogger: Logger;

  constructor({
    productConvertionWriterRepository,
    productConvertionReaderRepository,
    logger,
  }: ProductConvertionServiceDeps) {
    this.productConvertionWriterRepository = productConvertionWriterRepository;
    this.productConvertionReaderRepository = productConvertionReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async update(id: number, patch: UpdateProductConvertion): Promise<{ id: number }> {
    const found = await this.productConvertionReaderRepository.existById(id);
    if (!found) throw new HTTPException(404, { message: "package not found" });
    return await withLog(
      this.logger,
      "product_package_update",
      {
        id,
        patch,
      },
      () => this.productConvertionWriterRepository.update(id, patch),
    );
  }
}

export { ProductConvertionService };
export type { TProductConvertionService, ProductConvertionServiceDeps };
