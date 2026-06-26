import { asClass, type AwilixContainer } from "awilix";
import { HierarcyReaderRepository } from "./hierarcy-repository.js";
import { HierarcyService } from "./hierarcy-service.js";

function registerHierarcy(container: AwilixContainer) {
  container.register({
    hierarcyReaderRepository: asClass(HierarcyReaderRepository).scoped(),
    hierarcyService: asClass(HierarcyService).scoped(),
  });
}

export { registerHierarcy };
