import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { uomValidator } from "./uom-dto.js";

import type { TUomService } from "./uom-service.js";
import type { Uom, UomList } from "./uom.js";

type UomHandlerDeps = {
  uomService: TUomService;
  authMw: AuthMiddleware;
};

function createUomHandler({ uomService, authMw }: UomHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", uomValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await uomService.findAll(page, size, filter);
    return c.json(WebResponse.builder<UomList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", uomValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await uomService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await uomService.findById(parseInt(id));
    return c.json(WebResponse.builder<Uom>().data(response).build(), 200);
  });

  app.put("/:id", uomValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await uomService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await uomService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createUomHandler };
export type { UomHandlerDeps };
