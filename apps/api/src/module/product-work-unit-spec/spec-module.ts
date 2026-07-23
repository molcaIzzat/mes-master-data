import { asClass, type AwilixContainer } from "awilix";
import { ProductSpecReaderRepository, ProductSpecWriterRepository } from "./spec-repository.js";
import { ProductSpecService } from "./spec-service.js";

function registerProductSpec(container: AwilixContainer) {
  container.register({
    productSpecReaderRepository: asClass(ProductSpecReaderRepository).scoped(),
    productSpecWriterRepository: asClass(ProductSpecWriterRepository).scoped(),
    productSpecService: asClass(ProductSpecService).scoped(),
  });
}

export { registerProductSpec };
