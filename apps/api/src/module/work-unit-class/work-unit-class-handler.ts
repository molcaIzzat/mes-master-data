import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { workUnitClassValidator } from "./work-unit-class-dto.js";

import type { TWorkUnitClassService } from "./work-unit-class-service.js";
import type { WorkUnitClass, WorkUnitClassList } from "./work-unit-class.js";

type WorkUnitClassHandlerDeps = {
  workUnitClassService: TWorkUnitClassService;
  authMw: AuthMiddleware;
};

function createWorkUnitClassHandler({ workUnitClassService, authMw }: WorkUnitClassHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", workUnitClassValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await workUnitClassService.findAll(page, size, filter);
    return c.json(WebResponse.builder<WorkUnitClassList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", workUnitClassValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await workUnitClassService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await workUnitClassService.findById(parseInt(id));
    return c.json(WebResponse.builder<WorkUnitClass>().data(response).build(), 200);
  });

  app.put("/:id", workUnitClassValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await workUnitClassService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await workUnitClassService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createWorkUnitClassHandler };
export type { WorkUnitClassHandlerDeps };
