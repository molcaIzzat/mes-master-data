import { asClass, type AwilixContainer } from "awilix";
import {
  EquipmentClassReaderRepository,
  EquipmentClassWriterRepository,
} from "./equipment-class-repository.js";
import { EquipmentClassService } from "./equipment-class-service.js";

function registerEquipmentClass(container: AwilixContainer) {
  container.register({
    equipmentClassReaderRepository: asClass(EquipmentClassReaderRepository).scoped(),
    equipmentClassWriterRepository: asClass(EquipmentClassWriterRepository).scoped(),
    equipmentClassService: asClass(EquipmentClassService).scoped(),
  });
}

export { registerEquipmentClass };
