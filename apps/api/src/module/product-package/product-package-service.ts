import { HTTPException } from "hono/http-exception";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { ProductPackageReader, ProductPackageWriter } from "./product-package-repository.js";
import type { UpdateProductPackage } from "./product-package.js";

type ProductPackageServiceDeps = {
  productPackageWriterRepository: ProductPackageWriter;
  productPackageReaderRepository: ProductPackageReader;
  logger?: Logger;
};

type TProductPackageService = {
  update: (id: number, input: UpdateProductPackage) => Promise<{ id: number }>;
};

class ProductPackageService implements TProductPackageService {
  private productPackageWriterRepository: ProductPackageWriter;
  private productPackageReaderRepository: ProductPackageReader;
  private fallbackLogger: Logger;

  constructor({
    productPackageWriterRepository,
    productPackageReaderRepository,
    logger,
  }: ProductPackageServiceDeps) {
    this.productPackageWriterRepository = productPackageWriterRepository;
    this.productPackageReaderRepository = productPackageReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async update(id: number, patch: UpdateProductPackage): Promise<{ id: number }> {
    const found = await this.productPackageReaderRepository.existById(id);
    if (!found) throw new HTTPException(404, { message: "package not found" });
    return await withLog(
      this.logger,
      "product_package_update",
      {
        id,
        patch,
      },
      () => this.productPackageWriterRepository.update(id, patch),
    );
  }
}

export { ProductPackageService };
export type { TProductPackageService, ProductPackageServiceDeps };
