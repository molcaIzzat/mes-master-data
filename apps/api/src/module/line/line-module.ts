import { asClass, type AwilixContainer } from "awilix";
import { LineReaderRepository, LineWriterRepository } from "./line-repository.js";
import { LineService } from "./line-service.js";

function registerLine(container: AwilixContainer) {
  container.register({
    lineReaderRepository: asClass(LineReaderRepository).scoped(),
    lineWriterRepository: asClass(LineWriterRepository).scoped(),
    lineService: asClass(LineService).scoped(),
  });
}

export { registerLine };
