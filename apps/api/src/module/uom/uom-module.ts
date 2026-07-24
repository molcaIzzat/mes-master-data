import { asClass, type AwilixContainer } from "awilix";
import { UomReaderRepository, UomWriterRepository } from "./uom-repository.js";
import { UomService } from "./uom-service.js";

function registerUom(container: AwilixContainer) {
  container.register({
    uomReaderRepository: asClass(UomReaderRepository).scoped(),
    uomWriterRepository: asClass(UomWriterRepository).scoped(),
    uomService: asClass(UomService).scoped(),
  });
}

export { registerUom };
