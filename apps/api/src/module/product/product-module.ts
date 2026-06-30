import { asClass, type AwilixContainer } from "awilix";
import { ProductReaderRepository, ProductWriterRepository } from "./product-repository.js";
import { ProductService } from "./product-service.js";

function registerProduct(container: AwilixContainer) {
  container.register({
    productReaderRepository: asClass(ProductReaderRepository).scoped(),
    productWriterRepository: asClass(ProductWriterRepository).scoped(),
    productService: asClass(ProductService).scoped(),
  });
}

export { registerProduct };
