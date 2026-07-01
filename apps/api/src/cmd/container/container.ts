import { baseLogger } from "@molca/observability";
import { createContainer as newContainer, InjectionMode, asValue, asFunction } from "awilix";

import type {
  AreaClientContract,
  LineClientContract,
  MachineClientContract,
} from "@molca/contract-client";
import type { AuthMiddleware } from "@molca/security";
import type { AwilixContainer } from "awilix";

import { registerArea } from "../../module/area/area-module.js";
import { registerHealth } from "../../module/health/health-module.js";
import { registerInfra } from "../../shared/infra-module.js";
import { registerLine } from "../../module/line/line-module.js";
import { registerMachine } from "../../module/machine/machine-module.js";

import type { AreaReader, AreaWriter } from "../../module/area/area-repository.js";
import type { Probe } from "../../module/health/health-service.js";
import type { LineReader, LineWriter } from "../../module/line/line-repository.js";
import type { MachineReader, MachineWriter } from "../../module/machine/machine-repository.js";
import type { TMachineService } from "../../module/machine/machine-service.js";
import type { TAreaService } from "../../module/area/area-service.js";
import type { TLineService } from "../../module/line/line-service.js";
import type { AppConfig } from "../../shared/config/config.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { HierarcyReader } from "../../module/hierarcy/hierarcy-repository.js";
import type { THierarcyService } from "../../module/hierarcy/hierarcy-service.js";
import { registerHierarcy } from "../../module/hierarcy/hierarcy-module.js";
import type { ProductReader } from "../../module/product/product-repository.js";
import type { TProductService } from "../../module/product/product-service.js";
import { registerProduct } from "../../module/product/product-module.js";
import type {
  ProductPackageReader,
  ProductPackageWriter,
} from "../../module/product-package/product-package-repository.js";
import { registerProductPackage } from "../../module/product-package/product-package-module.js";
import type { TProductPackageService } from "../../module/product-package/product-package-service.js";
import type {
  ProductConvertionReader,
  ProductConvertionWriter,
} from "../../module/product-convertion/product-convertion-repository.js";
import type { TProductConvertionService } from "../../module/product-convertion/product-convertion-service.js";
import { registerProductConvertion } from "../../module/product-convertion/product-convertion-module.js";
import type {
  DowntimeReasonReader,
  DowntimeReasonWriter,
} from "../../module/downtime-reason/downtime-reason-repository.js";
import type { TDowntimeReasonService } from "../../module/downtime-reason/downtime-reason-service.js";
import { registerDowntimeReason } from "../../module/downtime-reason/downtime-reason-module.js";
import type {
  RejectReasonReader,
  RejectReasonWriter,
} from "../../module/reject-reason/reject-reason-repository.js";
import type { TRejectReasonService } from "../../module/reject-reason/reject-reason-service.js";
import { registerRejectReason } from "../../module/reject-reason/reject-reason-module.js";

type Cradle = {
  db: PostgresDB;
  authMw: AuthMiddleware;
  keycloakProbe: Probe;
  postgresProbe: Probe;
  areaClient: AreaClientContract;
  lineClient: LineClientContract;
  machineClient: MachineClientContract;
  areaReaderRepository: AreaReader;
  areaWriterRepository: AreaWriter;
  areaService: TAreaService;
  lineReaderRepository: LineReader;
  lineWriterRepository: LineWriter;
  lineService: TLineService;
  machineReaderRepository: MachineReader;
  machineWriterRepository: MachineWriter;
  machineService: TMachineService;
  hierarcyReaderRepository: HierarcyReader;
  hierarcyService: THierarcyService;
  productReaderRepository: ProductReader;
  productService: TProductService;
  productPackageReaderRepository: ProductPackageReader;
  productPackageWriterRepository: ProductPackageWriter;
  productPackageService: TProductPackageService;
  productConvertionReaderRepository: ProductConvertionReader;
  productConvertionWriterRepository: ProductConvertionWriter;
  productConvertionService: TProductConvertionService;
  downtimeReasonReaderRepository: DowntimeReasonReader;
  downtimeReasonWriterRepository: DowntimeReasonWriter;
  downtimeReasonService: TDowntimeReasonService;
  rejectReasonReaderRepository: RejectReasonReader;
  rejectReasonWriterRepository: RejectReasonWriter;
  rejectReasonService: TRejectReasonService;
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
  registerLine(container);
  registerMachine(container);
  registerHierarcy(container);
  registerProduct(container);
  registerProductPackage(container);
  registerProductConvertion(container);
  registerDowntimeReason(container);
  registerRejectReason(container);

  return container;
}

export { createContainer };
export type { Cradle };
