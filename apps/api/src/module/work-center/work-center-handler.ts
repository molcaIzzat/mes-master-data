import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { workCenterValidator } from "./work-center-dto.js";

import type { TWorkCenterService } from "./work-center-service.js";
import type { WorkCenter, WorkCenterList } from "./work-center.js";

type WorkCenterHandlerDeps = {
  workCenterService: TWorkCenterService;
  authMw: AuthMiddleware;
};

function createWorkCenterHandler({ workCenterService, authMw }: WorkCenterHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", workCenterValidator.paginate, async (c) => {
    const { page, size, q, areaId, type } = c.req.valid("query");
    const filter = {
      q,
      areaId,
      type,
    };
    const { items, meta } = await workCenterService.findAll(page, size, filter);
    return c.json(WebResponse.builder<WorkCenterList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", workCenterValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await workCenterService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await workCenterService.findById(parseInt(id));
    return c.json(WebResponse.builder<WorkCenter>().data(response).build(), 200);
  });

  app.put("/:id", workCenterValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await workCenterService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await workCenterService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createWorkCenterHandler };
export type { WorkCenterHandlerDeps };
