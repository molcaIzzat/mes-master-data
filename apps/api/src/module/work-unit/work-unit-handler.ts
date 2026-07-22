import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { workUnitValidator } from "./work-unit-dto.js";

import type { TWorkUnitService } from "./work-unit-service.js";
import type { WorkUnit, WorkUnitList } from "./work-unit.js";
import type { TCountPointService } from "../count-point/count-point-service.js";
import type { CountPoint, CountPointList } from "../count-point/count-point.js";

type WorkUnitHandlerDeps = {
  workUnitService: TWorkUnitService;
  countPointService: TCountPointService;
  authMw: AuthMiddleware;
};

function createWorkUnitHandler({
  workUnitService,
  countPointService,
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

  return app;
}

export { createWorkUnitHandler };
export type { WorkUnitHandlerDeps };
