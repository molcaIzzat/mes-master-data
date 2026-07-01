import { asClass, type AwilixContainer } from "awilix";

import { MachineReaderRepository, MachineWriterRepository } from "./machine-repository.js";
import { MachineService } from "./machine-service.js";
import { MachineClient } from "./machine-client.js";

function registerMachine(container: AwilixContainer) {
  container.register({
    machineReaderRepository: asClass(MachineReaderRepository).scoped(),
    machineWriterRepository: asClass(MachineWriterRepository).scoped(),
    machineService: asClass(MachineService).scoped(),
    machineClient: asClass(MachineClient).scoped(),
  });
}

export { registerMachine };
