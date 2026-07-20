import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { TEnterpriseService } from "./enterprise-service.js";
import { Hono } from "hono";
import { enterpriseValidator } from "./enterprise-dto.js";
import { WebResponse } from "@molca/network";
import type { Enterprise, EnterpriseList } from "./enterprise.js";

type EnterpriseHandlerDeps = {
  enterpriseService: TEnterpriseService;
  authMw: AuthMiddleware;
};

function createEnterpriseHandler({ enterpriseService, authMw }: EnterpriseHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", enterpriseValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await enterpriseService.findAll(page, size, filter);
    return c.json(WebResponse.builder<EnterpriseList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", enterpriseValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await enterpriseService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await enterpriseService.findById(parseInt(id));
    return c.json(WebResponse.builder<Enterprise>().data(response).build(), 200);
  });

  app.put("/:id", enterpriseValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await enterpriseService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await enterpriseService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createEnterpriseHandler };
export type { EnterpriseHandlerDeps };
