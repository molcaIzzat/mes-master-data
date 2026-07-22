import { asClass, type AwilixContainer } from "awilix";
import {
  CountPointReaderRepository,
  CountPointWriterRepository,
} from "./count-point-repository.js";
import { CountPointService } from "./count-point-service.js";

function registerCountPoint(container: AwilixContainer) {
  container.register({
    countPointReaderRepository: asClass(CountPointReaderRepository).scoped(),
    countPointWriterRepository: asClass(CountPointWriterRepository).scoped(),
    countPointService: asClass(CountPointService).scoped(),
  });
}

export { registerCountPoint };
