import { asClass, type AwilixContainer } from "awilix";
import {
  ProductConvertionReaderRepository,
  ProductConvertionWriterRepository,
} from "./product-convertion-repository.js";
import { ProductConvertionService } from "./product-convertion-service.js";

function registerProductConvertion(container: AwilixContainer) {
  container.register({
    productConvertionWriterRepository: asClass(ProductConvertionWriterRepository).scoped(),
    productConvertionReaderRepository: asClass(ProductConvertionReaderRepository).scoped(),
    productConvertionService: asClass(ProductConvertionService).scoped(),
  });
}

export { registerProductConvertion };
