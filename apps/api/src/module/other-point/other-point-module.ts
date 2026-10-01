import { asClass, type AwilixContainer } from "awilix";
import {
  OtherPointReaderRepository,
  OtherPointWriterRepository,
} from "./other-point-repository.js";
import { OtherPointService } from "./other-point-service.js";

function registerOtherPoint(container: AwilixContainer) {
  container.register({
    otherPointReaderRepository: asClass(OtherPointReaderRepository).scoped(),
    otherPointWriterRepository: asClass(OtherPointWriterRepository).scoped(),
    otherPointService: asClass(OtherPointService).scoped(),
  });
}

export { registerOtherPoint };
