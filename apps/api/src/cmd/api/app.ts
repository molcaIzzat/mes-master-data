import { startOtel } from "@molca/observability";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";

// Start the OTel SDK before anything else loads so instrumentation can patch
// modules. In prod this is a no-op (already started by --import instrumentation.mjs).
// Postgres instrumentation is app-specific, so it is passed in here.
startOtel({ instrumentations: [new PgInstrumentation()] });

import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { serializeError } from "@molca/utils";
import { WebResponse } from "@molca/network";
import { observability, baseLogger, getRequestContext } from "@molca/observability";

import type { ContentfulStatusCode } from "hono/utils/http-status";

import { createContainer } from "../container/container.js";
import { createHealthHandler } from "../../module/health/health-handler.js";
import { mapDomainError } from "../../module/error-mapper/error-mapper.js";
import { createAreaHandler } from "../../module/area/area-handler.js";
import { createLineHandler } from "../../module/line/line-handler.js";
import { createMachineHandler } from "../../module/machine/machine-handler.js";
import { loadConfig } from "../../shared/config/config.js";
import { createHierarcyHandler } from "../../module/hierarcy/hierarcy-handler.js";
import { createProductHandler } from "../../module/product/product-handler.js";
import { createProductPackageHandler } from "../../module/product-package/product-package-handler.js";
import { createProductConvertionHandler } from "../../module/product-convertion/product-convertion-handler.js";
import { createDowntimeReasonHandler } from "../../module/downtime-reason/downtime-reason-handler.js";
import { createRejectReasonHandler } from "../../module/reject-reason/reject-reason-handler.js";
import { createDowntimeActionHandler } from "../../module/downtime-action/downtime-action-handler.js";
import { createSiteHandler } from "../../module/site/site-handler.js";
import { createWorkCenterClassHandler } from "../../module/work-center-class/work-center-class-handler.js";
import { createEquipmentClassHandler } from "../../module/equipment-class/equipment-class-handler.js";
import { createWorkCenterHandler } from "../../module/work-center/work-center-handler.js";
import { createEnterpriseHandler } from "../../module/enterprise/enterprise-handler.js";
import { createWorkUnitClassHandler } from "../../module/work-unit-class/work-unit-class-handler.js";
import { createWorkUnitHandler } from "../../module/work-unit/work-unit-handler.js";
import { createEquipmentHandler } from "../../module/equipment/equipment-handler.js";
import { createEdgeHandler } from "../../module/edge/edge-handler.js";
import { createUomHandler } from "../../module/uom/uom-handler.js";

const config = loadConfig();
const container = createContainer(config);

const app = new Hono();

app.use("*", httpInstrumentationMiddleware());
app.use("*", observability());
app.use(
  "*",
  cors({
    origin: config.cors.allowedOrigins,
  }),
);

app.route(
  "/health",
  createHealthHandler({
    keycloakProbe: container.resolve("keycloakProbe"),
    postgresProbe: container.resolve("postgresProbe"),
  }),
);

const api = new Hono().basePath("/v1");

api.route(
  "/enterprises",
  createEnterpriseHandler({
    authMw: container.resolve("authMw"),
    enterpriseService: container.resolve("enterpriseService"),
  }),
);

api.route(
  "/uoms",
  createUomHandler({
    authMw: container.resolve("authMw"),
    uomService: container.resolve("uomService"),
  }),
);

api.route(
  "/sites",
  createSiteHandler({
    authMw: container.resolve("authMw"),
    siteService: container.resolve("siteService"),
  }),
);

api.route(
  "/areas",
  createAreaHandler({
    authMw: container.resolve("authMw"),
    areaService: container.resolve("areaService"),
  }),
);

api.route(
  "/work-center-classes",
  createWorkCenterClassHandler({
    authMw: container.resolve("authMw"),
    workCenterClassService: container.resolve("workCenterClassService"),
  }),
);

api.route(
  "/work-centers",
  createWorkCenterHandler({
    authMw: container.resolve("authMw"),
    workCenterService: container.resolve("workCenterService"),
  }),
);

api.route(
  "/work-centers",
  createEdgeHandler({
    authMw: container.resolve("authMw"),
    edgeService: container.resolve("edgeService"),
  }),
);

api.route(
  "/work-unit-classes",
  createWorkUnitClassHandler({
    authMw: container.resolve("authMw"),
    workUnitClassService: container.resolve("workUnitClassService"),
  }),
);

api.route(
  "/work-units",
  createWorkUnitHandler({
    authMw: container.resolve("authMw"),
    workUnitService: container.resolve("workUnitService"),
    countPointService: container.resolve("countPointService"),
    productSpecService: container.resolve("productSpecService"),
    productAliasService: container.resolve("productAliasService"),
  }),
);

api.route(
  "/equipment-classes",
  createEquipmentClassHandler({
    authMw: container.resolve("authMw"),
    equipmentClassService: container.resolve("equipmentClassService"),
  }),
);

api.route(
  "/equipments",
  createEquipmentHandler({
    authMw: container.resolve("authMw"),
    equipmentService: container.resolve("equipmentService"),
  }),
);

api.route(
  "/products",
  createProductHandler({
    authMw: container.resolve("authMw"),
    productService: container.resolve("productService"),
  }),
);

api.route(
  "/product-packages",
  createProductPackageHandler({
    authMw: container.resolve("authMw"),
    productPackageService: container.resolve("productPackageService"),
  }),
);

api.route(
  "/product-convertions",
  createProductConvertionHandler({
    authMw: container.resolve("authMw"),
    productConvertionService: container.resolve("productConvertionService"),
  }),
);

api.route(
  "/downtime-reasons",
  createDowntimeReasonHandler({
    authMw: container.resolve("authMw"),
    downtimeReasonService: container.resolve("downtimeReasonService"),
  }),
);

api.route(
  "/downtime-actions",
  createDowntimeActionHandler({
    authMw: container.resolve("authMw"),
    downtimeActionService: container.resolve("downtimeActionService"),
  }),
);

api.route(
  "/reject-reasons",
  createRejectReasonHandler({
    authMw: container.resolve("authMw"),
    rejectReasonService: container.resolve("rejectReasonService"),
  }),
);

/**
 * @deprecated
 * This API Resource is no longger use
 *
 **/
api.route(
  "/lines",
  createLineHandler({
    authMw: container.resolve("authMw"),
    lineService: container.resolve("lineService"),
  }),
);

/**
 * @deprecated
 * This API Resource is no longger use
 *
 **/
api.route(
  "/machines",
  createMachineHandler({
    authMw: container.resolve("authMw"),
    machineService: container.resolve("machineService"),
  }),
);

/**
 * @deprecated
 * This API Resource is no longger use
 *
 **/
api.route(
  "/hierarcies",
  createHierarcyHandler({
    authMw: container.resolve("authMw"),
    hierarcyService: container.resolve("hierarcyService"),
  }),
);

app.route("/", api);

app.notFound((c) => {
  return c.json(WebResponse.builder<string>().error("not found page").build(), 404);
});

app.onError(async (err, c) => {
  const mapped = mapDomainError(err);
  if (mapped !== null) {
    const errRes = mapped.getResponse();
    const errMessage: string = await errRes.text();
    const errStatus: ContentfulStatusCode = errRes.status as ContentfulStatusCode;
    return c.json(WebResponse.builder<string>().error(errMessage).build(), errStatus);
  }

  const log = getRequestContext()?.logger ?? baseLogger;
  log.withMetadata({ err: serializeError(err) }).error("internal_server_error");
  return c.json(WebResponse.builder<string>().error("internal server error").build(), 500);
});

export { container };
export default app;
