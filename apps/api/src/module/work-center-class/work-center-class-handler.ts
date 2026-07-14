import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { workCenterClassValidator } from "./work-center-class-dto.js";

import type { TWorkCenterClassService } from "./work-center-class-service.js";
import type { WorkCenterClass, WorkCenterClassList } from "./work-center-class.js";

type WorkCenterClassHandlerDeps = {
  workCenterClassService: TWorkCenterClassService;
  authMw: AuthMiddleware;
};

function createWorkCenterClassHandler({
  workCenterClassService,
  authMw,
}: WorkCenterClassHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", workCenterClassValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await workCenterClassService.findAll(page, size, filter);
    return c.json(WebResponse.builder<WorkCenterClassList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", workCenterClassValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await workCenterClassService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await workCenterClassService.findById(parseInt(id));
    return c.json(WebResponse.builder<WorkCenterClass>().data(response).build(), 200);
  });

  app.put("/:id", workCenterClassValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await workCenterClassService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await workCenterClassService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createWorkCenterClassHandler };
export type { WorkCenterClassHandlerDeps };
