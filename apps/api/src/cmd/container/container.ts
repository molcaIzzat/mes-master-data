import { baseLogger } from "@molca/observability";
import { createContainer as newContainer, InjectionMode, asValue, asFunction } from "awilix";

import type { CommentClientContract } from "@molca/contract-client";
import type { AuthMiddleware } from "@molca/security";
import type { AwilixContainer } from "awilix";

import { registerArea } from "../../module/area/area-module.js";
import { registerHealth } from "../../module/health/health-module.js";
import { registerInfra } from "../../shared/infra-module.js";

import type { Probe } from "../../module/health/health-service.js";
import type { AreaReader, AreaWriter } from "../../module/area/area-repository.js";
import type { TAreaService } from "../../module/area/area-service.js";
import type { AppConfig } from "../../shared/config/config.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type Cradle = {
  db: PostgresDB;
  authMw: AuthMiddleware;
  keycloakProbe: Probe;
  postgresProbe: Probe;
  commentClient: CommentClientContract;
  areaReaderRepository: AreaReader;
  areaWriterRepository: AreaWriter;
  areaService: TAreaService;
};

function createContainer(config: AppConfig): AwilixContainer<Cradle> {
  const container: AwilixContainer<Cradle> = newContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    region: asValue(config.region),
    logger: asFunction(() => baseLogger).singleton(),
  });
  registerInfra(container, config);
  registerHealth(container, config);
  registerArea(container);

  return container;
}

export { createContainer };
export type { Cradle };
