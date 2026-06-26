import { asClass, type AwilixContainer } from "awilix";

import { MachineReaderRepository, MachineWriterRepository } from "./machine-repository.js";
import { MachineService } from "./machine-service.js";

function registerMachine(container: AwilixContainer) {
  container.register({
    machineReaderRepository: asClass(MachineReaderRepository).scoped(),
    machineWriterRepository: asClass(MachineWriterRepository).scoped(),
    machineService: asClass(MachineService).scoped(),
  });
}

export { registerMachine };
