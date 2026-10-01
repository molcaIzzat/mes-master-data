import { asClass, type AwilixContainer } from "awilix";
import { WorkUnitReaderRepository, WorkUnitWriterRepository } from "./work-unit-repository.js";
import { WorkUnitService } from "./work-unit-service.js";

function registerWorkUnit(container: AwilixContainer) {
  container.register({
    workUnitReaderRepository: asClass(WorkUnitReaderRepository).scoped(),
    workUnitWriterRepository: asClass(WorkUnitWriterRepository).scoped(),
    workUnitService: asClass(WorkUnitService).scoped(),
  });
}

export { registerWorkUnit };
