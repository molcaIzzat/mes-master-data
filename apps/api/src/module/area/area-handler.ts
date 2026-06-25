import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { TAreaService } from "./area-service.js";
import { Hono } from "hono";
import { areaValidator } from "./area-dto.js";
import { WebResponse } from "@molca/network";
import type { Area, AreaList } from "./area.js";

type AreaHandlerDeps = {
  areaService: TAreaService;
  authMw: AuthMiddleware;
};

function createAreaHandler({ areaService, authMw }: AreaHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", areaValidator.paginate, async (c) => {
    const { page, size, q, factoryId } = c.req.valid("query");
    const filter = {
      q,
      factoryId,
    };
    const { items, meta } = await areaService.findAll(page, size, filter);
    return c.json(WebResponse.builder<AreaList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", areaValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await areaService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await areaService.findById(parseInt(id));
    return c.json(WebResponse.builder<Area>().data(response).build(), 200);
  });

  app.put("/:id", areaValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await areaService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await areaService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createAreaHandler };
export type { AreaHandlerDeps };
