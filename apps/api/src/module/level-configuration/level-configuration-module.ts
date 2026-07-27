import { asClass, type AwilixContainer } from "awilix";

import { LevelConfigurationReaderRepository } from "./level-configuration-repository.js";
import { LevelConfigurationService } from "./level-configuration-service.js";

function registerLevelConfiguration(container: AwilixContainer) {
  container.register({
    levelConfigurationReaderRepository: asClass(LevelConfigurationReaderRepository).scoped(),
    levelConfigurationService: asClass(LevelConfigurationService).scoped(),
  });
}

export { registerLevelConfiguration };
