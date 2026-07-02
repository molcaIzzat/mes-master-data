import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { THierarcyService } from "./hierarcy-service.js";
import { Hono } from "hono";
import { hierarcyValidator } from "./hierarcy-dto.js";
import { WebResponse } from "@molca/network";
import type { LineHierarcy } from "./hierarcy.js";

type HierarcyHandlerDeps = {
  hierarcyService: THierarcyService;
  authMw: AuthMiddleware;
};

function createHierarcyHandler({ hierarcyService, authMw }: HierarcyHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/lines", hierarcyValidator.paginateLineHierarcy, async (c) => {
    const { page, size, q, areaId } = c.req.valid("query");
    const filter = {
      q,
      areaId,
    };
    const { items, meta } = await hierarcyService.findLineHierarcy(page, size, filter);
    return c.json(WebResponse.builder<LineHierarcy[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/lines", hierarcyValidator.createLine, async (c) => {
    const input = c.req.valid("json");
    const resp = await hierarcyService.createLineWithMachines(input);
    return c.json(WebResponse.builder<string>().data(resp).build(), 201);
  });

  app.post("/lines/:id", hierarcyValidator.createMachines, async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const resp = await hierarcyService.createMachines(parseInt(id), input.machines);
    return c.json(WebResponse.builder<string>().data(resp).build(), 201);
  });

  app.post("/machines/:id", hierarcyValidator.createSubMachines, async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const resp = await hierarcyService.createSubMachines(parseInt(id), input.machines);
    return c.json(WebResponse.builder<string>().data(resp).build(), 201);
  });

  return app;
}

export { createHierarcyHandler };
export type { HierarcyHandlerDeps };
