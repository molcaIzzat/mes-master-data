import { asClass, type AwilixContainer } from "awilix";

import { EdgeReaderRepository, EdgeWriterRepository } from "./edge-repository.js";
import { EdgeService } from "./edge-service.js";

function registerEdge(container: AwilixContainer) {
  container.register({
    edgeReaderRepository: asClass(EdgeReaderRepository).scoped(),
    edgeWriterRepository: asClass(EdgeWriterRepository).scoped(),
    edgeService: asClass(EdgeService).scoped(),
  });
}

export { registerEdge };
