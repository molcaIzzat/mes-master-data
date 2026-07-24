import { baseLogger } from "@molca/observability";
import { createContainer as newContainer, InjectionMode, asValue, asFunction } from "awilix";

import type {
  AreaClientContract,
  EnterpriseClientContract,
  EquipmentClientContract,
  LineClientContract,
  MachineClientContract,
  WorkCenterClientContract,
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
import type {
  DowntimeActionReader,
  DowntimeActionWriter,
} from "../../module/downtime-action/downtime-action-repository.js";
import type { TDowntimeActionService } from "../../module/downtime-action/downtime-action-service.js";
import { registerDowntimeAction } from "../../module/downtime-action/downtime-action-module.js";
import type {
  WorkCenterClassReader,
  WorkCenterClassWriter,
} from "../../module/work-center-class/work-center-class-repository.js";
import type { TWorkCenterClassService } from "../../module/work-center-class/work-center-class-service.js";
import { registerWorkCenterClass } from "../../module/work-center-class/work-center-class-module.js";
import type {
  EquipmentClassReader,
  EquipmentClassWriter,
} from "../../module/equipment-class/equipment-class-repository.js";
import type { TEquipmentClassService } from "../../module/equipment-class/equipment-class-service.js";
import { registerEquipmentClass } from "../../module/equipment-class/equipment-class-module.js";
import type {
  WorkCenterReader,
  WorkCenterWriter,
} from "../../module/work-center/work-center-repository.js";
import type { TWorkCenterService } from "../../module/work-center/work-center-service.js";
import { registerWorkCenter } from "../../module/work-center/work-center-module.js";
import type {
  WorkUnitReader,
  WorkUnitWriter,
} from "../../module/work-unit/work-unit-repository.js";
import type { TWorkUnitService } from "../../module/work-unit/work-unit-service.js";
import { registerWorkUnit } from "../../module/work-unit/work-unit-module.js";
import type {
  EquipmentReader,
  EquipmentWriter,
} from "../../module/equipment/equipment-repository.js";
import type { TEquipmentService } from "../../module/equipment/equipment-service.js";
import { registerEquipment } from "../../module/equipment/equipment-module.js";
import type { SiteReader, SiteWriter } from "../../module/site/site-repository.js";
import type { TSiteService } from "../../module/site/site-service.js";
import { registerSite } from "../../module/site/site-module.js";
import type {
  EnterpriseReader,
  EnterpriseWriter,
} from "../../module/enterprise/enterprise-repository.js";
import type { TEnterpriseService } from "../../module/enterprise/enterprise-service.js";
import { registerEnterprise } from "../../module/enterprise/enterprise-module.js";
import type {
  WorkUnitClassReader,
  WorkUnitClassWriter,
} from "../../module/work-unit-class/work-unit-class-repository.js";
import type { TWorkUnitClassService } from "../../module/work-unit-class/work-unit-class-service.js";
import { registerWorkUnitClass } from "../../module/work-unit-class/work-unit-class-module.js";
import type { EdgeReader, EdgeWriter } from "../../module/edge/edge-repository.js";
import type { TEdgeService } from "../../module/edge/edge-service.js";
import { registerEdge } from "../../module/edge/edge-module.js";
import type {
  CountPointReader,
  CountPointWriter,
} from "../../module/count-point/count-point-repository.js";
import type { TCountPointService } from "../../module/count-point/count-point-service.js";
import { registerCountPoint } from "../../module/count-point/count-point-module.js";
import type {
  ProductSpecReader,
  ProductSpecWriter,
} from "../../module/product-work-unit-spec/spec-repository.js";
import type { TProductSpecService } from "../../module/product-work-unit-spec/spec-service.js";
import { registerProductSpec } from "../../module/product-work-unit-spec/spec-module.js";
import type {
  ProductAliasReader,
  ProductAliasWriter,
} from "../../module/product-alias/product-alias-repository.js";
import type { TProductAliasService } from "../../module/product-alias/product-alias-service.js";
import { registerProductAlias } from "../../module/product-alias/product-alias-module.js";
import type { UomReader, UomWriter } from "../../module/uom/uom-repository.js";
import type { TUomService } from "../../module/uom/uom-service.js";
import { registerUom } from "../../module/uom/uom-module.js";

type Cradle = {
  db: PostgresDB;
  authMw: AuthMiddleware;
  keycloakProbe: Probe;
  postgresProbe: Probe;
  enterpriseClient: EnterpriseClientContract;
  areaClient: AreaClientContract;
  lineClient: LineClientContract;
  workCenterClient: WorkCenterClientContract;
  equipmentClient: EquipmentClientContract;
  machineClient: MachineClientContract;
  siteReaderRepository: SiteReader;
  siteWriterRepository: SiteWriter;
  siteService: TSiteService;
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
  downtimeActionReaderRepository: DowntimeActionReader;
  downtimeActionWriterRepository: DowntimeActionWriter;
  downtimeActionService: TDowntimeActionService;
  workCenterClassReaderRepository: WorkCenterClassReader;
  workCenterClassWriterRepository: WorkCenterClassWriter;
  workCenterClassService: TWorkCenterClassService;
  equipmentClassReaderRepository: EquipmentClassReader;
  equipmentClassWriterRepository: EquipmentClassWriter;
  equipmentClassService: TEquipmentClassService;
  workCenterReaderRepository: WorkCenterReader;
  workCenterWriterRepository: WorkCenterWriter;
  workCenterService: TWorkCenterService;
  workUnitReaderRepository: WorkUnitReader;
  workUnitWriterRepository: WorkUnitWriter;
  workUnitService: TWorkUnitService;
  equipmentReaderRepository: EquipmentReader;
  equipmentWriterRepository: EquipmentWriter;
  equipmentService: TEquipmentService;
  enterpriseReaderRepository: EnterpriseReader;
  enterpriseWriterRepository: EnterpriseWriter;
  enterpriseService: TEnterpriseService;
  workUnitClassReaderRepository: WorkUnitClassReader;
  workUnitClassWriterRepository: WorkUnitClassWriter;
  workUnitClassService: TWorkUnitClassService;
  edgeReaderRepository: EdgeReader;
  edgeWriterRepository: EdgeWriter;
  edgeService: TEdgeService;
  countPointReaderRepository: CountPointReader;
  countPointWriterRepository: CountPointWriter;
  countPointService: TCountPointService;
  productSpecReaderRepository: ProductSpecReader;
  productSpecWriterRepository: ProductSpecWriter;
  productSpecService: TProductSpecService;
  productAliasReaderRepository: ProductAliasReader;
  productAliasWriterRepository: ProductAliasWriter;
  productAliasService: TProductAliasService;
  uomReaderRepository: UomReader;
  uomWriterRepository: UomWriter;
  uomService: TUomService;
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
  registerEnterprise(container);
  registerUom(container);
  registerSite(container);
  registerArea(container);
  registerWorkCenterClass(container);
  registerCountPoint(container);
  registerWorkCenter(container);
  registerWorkUnitClass(container);
  registerWorkUnit(container);
  registerEdge(container);
  registerEquipmentClass(container);
  registerEquipment(container);
  registerLine(container);
  registerMachine(container);
  registerHierarcy(container);
  registerProduct(container);
  registerProductPackage(container);
  registerProductConvertion(container);
  registerProductSpec(container);
  registerProductAlias(container);
  registerDowntimeReason(container);
  registerRejectReason(container);
  registerDowntimeAction(container);

  return container;
}

export { createContainer };
export type { Cradle };
