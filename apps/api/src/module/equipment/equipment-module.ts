import { asClass, type AwilixContainer } from "awilix";
import { EquipmentReaderRepository, EquipmentWriterRepository } from "./equipment-repository.js";
import { EquipmentService } from "./equipment-service.js";
import { EquipmentClient } from "./equipment-client.js";

function registerEquipment(container: AwilixContainer) {
  container.register({
    equipmentReaderRepository: asClass(EquipmentReaderRepository).scoped(),
    equipmentWriterRepository: asClass(EquipmentWriterRepository).scoped(),
    equipmentService: asClass(EquipmentService).scoped(),
    equipmentClient: asClass(EquipmentClient).scoped(),
  });
}

export { registerEquipment };
