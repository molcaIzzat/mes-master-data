import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { workUnitValidator } from "./work-unit-dto.js";

import type { TWorkUnitService } from "./work-unit-service.js";
import type { WorkUnit, WorkUnitList } from "./work-unit.js";

import type { TCountPointService } from "../count-point/count-point-service.js";
import type { CountPoint, CountPointList } from "../count-point/count-point.js";
import type { TProductSpecService } from "../product-work-unit-spec/spec-service.js";
import type { ProductSpec, ProductSpecList } from "../product-work-unit-spec/spec.js";
import type { TProductAliasService } from "../product-alias/product-alias-service.js";
import type { ProductAlias, ProductAliasList } from "../product-alias/product-alias.js";

type WorkUnitHandlerDeps = {
  workUnitService: TWorkUnitService;
  countPointService: TCountPointService;
  productSpecService: TProductSpecService;
  productAliasService: TProductAliasService;
  authMw: AuthMiddleware;
};

function createWorkUnitHandler({
  workUnitService,
  countPointService,
  productSpecService,
  productAliasService,
  authMw,
}: WorkUnitHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", workUnitValidator.paginate, async (c) => {
    const { page, size, q, workCenterId, type } = c.req.valid("query");
    const filter = {
      q,
      workCenterId,
      type,
    };
    const { items, meta } = await workUnitService.findAll(page, size, filter);
    return c.json(WebResponse.builder<WorkUnitList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/count-points", workUnitValidator.paginateCP, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await countPointService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<CountPointList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/product-specs", workUnitValidator.paginateProductSpec, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await productSpecService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<ProductSpecList[]>().data(items).meta(meta).build(), 200);
  });

  app.get("/:id/product-aliases", workUnitValidator.paginateProductAlias, async (c) => {
    const workUnitId = c.req.param("id");
    const { page, size } = c.req.valid("query");
    const { items, meta } = await productAliasService.findManyByWorkUnitId(
      parseInt(workUnitId),
      page,
      size,
    );
    return c.json(WebResponse.builder<ProductAliasList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", workUnitValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await workUnitService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.post("/:id/count-points", workUnitValidator.createCP, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await countPointService.create({ ...body, workUnitId: parseInt(workUnitId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.post("/:id/product-specs", workUnitValidator.createProductSpec, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await productSpecService.create({ ...body, workUnitId: parseInt(workUnitId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.post("/:id/product-aliases", workUnitValidator.createProductAlias, async (c) => {
    const workUnitId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await productAliasService.create({
      ...body,
      workUnitId: parseInt(workUnitId),
    });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await workUnitService.findById(parseInt(id));
    return c.json(WebResponse.builder<WorkUnit>().data(response).build(), 200);
  });

  app.get("/:id/count-points/:cpId", async (c) => {
    const { cpId } = c.req.param();
    const response = await countPointService.findById(parseInt(cpId));
    return c.json(WebResponse.builder<CountPoint>().data(response).build(), 200);
  });

  app.get("/:id/product-specs/:specId", async (c) => {
    const { specId } = c.req.param();
    const response = await productSpecService.findById(parseInt(specId));
    return c.json(WebResponse.builder<ProductSpec>().data(response).build(), 200);
  });

  app.get("/:id/product-aliases/:aliasId", async (c) => {
    const { aliasId } = c.req.param();
    const response = await productAliasService.findById(parseInt(aliasId));
    return c.json(WebResponse.builder<ProductAlias>().data(response).build(), 200);
  });

  app.put("/:id", workUnitValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await workUnitService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/count-points/:cpId", workUnitValidator.updateCP, async (c) => {
    const { cpId } = c.req.param();
    const body = c.req.valid("json");
    const response = await countPointService.update(parseInt(cpId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/product-specs/:specId", workUnitValidator.updateProductSpec, async (c) => {
    const { specId } = c.req.param();
    const body = c.req.valid("json");
    const response = await productSpecService.update(parseInt(specId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.put("/:id/product-aliases/:aliasId", workUnitValidator.updateProductAlias, async (c) => {
    const { aliasId } = c.req.param();
    const body = c.req.valid("json");
    const response = await productAliasService.update(parseInt(aliasId), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await workUnitService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/count-points/:cpId", async (c) => {
    const { cpId } = c.req.param();
    const deleted = await countPointService.delete(parseInt(cpId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/product-specs/:specId", async (c) => {
    const { specId } = c.req.param();
    const deleted = await productSpecService.delete(parseInt(specId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.delete("/:id/product-aliases/:aliasId", async (c) => {
    const { aliasId } = c.req.param();
    const deleted = await productAliasService.delete(parseInt(aliasId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createWorkUnitHandler };
export type { WorkUnitHandlerDeps };
