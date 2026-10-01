import { asClass, type AwilixContainer } from "awilix";
import {
  WorkUnitClassReaderRepository,
  WorkUnitClassWriterRepository,
} from "./work-unit-class-repository.js";
import { WorkUnitClassService } from "./work-unit-class-service.js";

function registerWorkUnitClass(container: AwilixContainer) {
  container.register({
    workUnitClassReaderRepository: asClass(WorkUnitClassReaderRepository).scoped(),
    workUnitClassWriterRepository: asClass(WorkUnitClassWriterRepository).scoped(),
    workUnitClassService: asClass(WorkUnitClassService).scoped(),
  });
}

export { registerWorkUnitClass };
