import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { lineValidator } from "./line-dto.js";

import type { TLineService } from "./line-service.js";
import type { Line, LineList } from "./line.js";

type LineHandlerDeps = {
  lineService: TLineService;
  authMw: AuthMiddleware;
};

function createLineHandler({ lineService, authMw }: LineHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", lineValidator.paginate, async (c) => {
    const { page, size, q, areaId, category } = c.req.valid("query");
    const filter = {
      q,
      areaId,
      category,
    };
    const { items, meta } = await lineService.findAll(page, size, filter);
    return c.json(WebResponse.builder<LineList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", lineValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await lineService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await lineService.findById(parseInt(id));
    return c.json(WebResponse.builder<Line>().data(response).build(), 200);
  });

  app.put("/:id", lineValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await lineService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await lineService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createLineHandler };
export type { LineHandlerDeps };
