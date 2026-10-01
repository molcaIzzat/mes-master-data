import { asClass, type AwilixContainer } from "awilix";
import {
  ProductAliasReaderRepository,
  ProductAliasWriterRepository,
} from "./product-alias-repository.js";
import { ProductAliasService } from "./product-alias-service.js";

function registerProductAlias(container: AwilixContainer) {
  container.register({
    productAliasReaderRepository: asClass(ProductAliasReaderRepository).scoped(),
    productAliasWriterRepository: asClass(ProductAliasWriterRepository).scoped(),
    productAliasService: asClass(ProductAliasService).scoped(),
  });
}

export { registerProductAlias };
