import { asClass, type AwilixContainer } from "awilix";
import {
  ProductPackageReaderRepository,
  ProductPackageWriterRepository,
} from "./product-package-repository.js";
import { ProductPackageService } from "./product-package-service.js";

function registerProductPackage(container: AwilixContainer) {
  container.register({
    productPackageWriterRepository: asClass(ProductPackageWriterRepository).scoped(),
    productPackageReaderRepository: asClass(ProductPackageReaderRepository).scoped(),
    productPackageService: asClass(ProductPackageService).scoped(),
  });
}

export { registerProductPackage };
