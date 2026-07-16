import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { siteValidator } from "./site-dto.js";

import type { TSiteService } from "./site-service.js";
import type { Site, SiteList } from "./site.js";

type SiteHandlerDeps = {
  siteService: TSiteService;
  authMw: AuthMiddleware;
};

function createSiteHandler({ siteService, authMw }: SiteHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", siteValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await siteService.findAll(page, size, filter);
    return c.json(WebResponse.builder<SiteList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", siteValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await siteService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await siteService.findById(parseInt(id));
    return c.json(WebResponse.builder<Site>().data(response).build(), 200);
  });

  app.put("/:id", siteValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await siteService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await siteService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createSiteHandler };
export type { SiteHandlerDeps };
