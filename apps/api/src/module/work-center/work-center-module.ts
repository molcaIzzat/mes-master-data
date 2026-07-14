import { asClass, type AwilixContainer } from "awilix";
import {
  WorkCenterReaderRepository,
  WorkCenterWriterRepository,
} from "./work-center-repository.js";
import { WorkCenterService } from "./work-center-service.js";
import { WorkCenterClient } from "./work-center-client.js";

function registerWorkCenter(container: AwilixContainer) {
  container.register({
    workCenterReaderRepository: asClass(WorkCenterReaderRepository).scoped(),
    workCenterWriterRepository: asClass(WorkCenterWriterRepository).scoped(),
    workCenterService: asClass(WorkCenterService).scoped(),
    workCenterClient: asClass(WorkCenterClient).scoped(),
  });
}

export { registerWorkCenter };
