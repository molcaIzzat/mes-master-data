import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { downtimeActionValidator } from "./downtime-action-dto.js";

import type { TDowntimeActionService } from "./downtime-action-service.js";
import type { DowntimeAction, DowntimeActionList } from "./downtime-action.js";

type DowntimeActionHandlerDeps = {
  downtimeActionService: TDowntimeActionService;
  authMw: AuthMiddleware;
};

function createDowntimeActionHandler({ downtimeActionService, authMw }: DowntimeActionHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", downtimeActionValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await downtimeActionService.findAll(page, size, filter);
    return c.json(WebResponse.builder<DowntimeActionList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", downtimeActionValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await downtimeActionService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await downtimeActionService.findById(parseInt(id));
    return c.json(WebResponse.builder<DowntimeAction>().data(response).build(), 200);
  });

  app.put("/:id", downtimeActionValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await downtimeActionService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await downtimeActionService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createDowntimeActionHandler };
export type { DowntimeActionHandlerDeps };
