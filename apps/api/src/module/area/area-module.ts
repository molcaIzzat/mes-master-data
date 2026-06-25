import { asClass, type AwilixContainer } from "awilix";

import { AreaReaderRepository, AreaWriterRepository } from "./area-repository.js";
import { AreaService } from "./area-service.js";

function registerArea(container: AwilixContainer) {
  container.register({
    areaReaderRepository: asClass(AreaReaderRepository).scoped(),
    areaWriterRepository: asClass(AreaWriterRepository).scoped(),
    areaService: asClass(AreaService).scoped(),
  });
}

export { registerArea };
