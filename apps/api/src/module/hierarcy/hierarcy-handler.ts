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

  return app;
}

export { createHierarcyHandler };
export type { HierarcyHandlerDeps };
