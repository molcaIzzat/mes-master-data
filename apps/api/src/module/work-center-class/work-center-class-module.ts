import { asClass, type AwilixContainer } from "awilix";
import {
  WorkCenterClassReaderRepository,
  WorkCenterClassWriterRepository,
} from "./work-center-class-repository.js";
import { WorkCenterClassService } from "./work-center-class-service.js";

function registerWorkCenterClass(container: AwilixContainer) {
  container.register({
    workCenterClassReaderRepository: asClass(WorkCenterClassReaderRepository).scoped(),
    workCenterClassWriterRepository: asClass(WorkCenterClassWriterRepository).scoped(),
    workCenterClassService: asClass(WorkCenterClassService).scoped(),
  });
}

export { registerWorkCenterClass };
