import { asClass, type AwilixContainer } from "awilix";

import { EnterpriseReaderRepository, EnterpriseWriterRepository } from "./enterprise-repository.js";
import { EnterpriseService } from "./enterprise-service.js";
import { EnterpriseClient } from "./enterprise-client.js";

function registerEnterprise(container: AwilixContainer) {
  container.register({
    enterpriseReaderRepository: asClass(EnterpriseReaderRepository).scoped(),
    enterpriseWriterRepository: asClass(EnterpriseWriterRepository).scoped(),
    enterpriseService: asClass(EnterpriseService).scoped(),
    enterpriseClient: asClass(EnterpriseClient).scoped(),
  });
}

export { registerEnterprise };
