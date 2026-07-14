import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { equipmentClassValidator } from "./equipment-class-dto.js";

import type { TEquipmentClassService } from "./equipment-class-service.js";
import type { EquipmentClass, EquipmentClassList } from "./equipment-class.js";

type EquipmentClassHandlerDeps = {
  equipmentClassService: TEquipmentClassService;
  authMw: AuthMiddleware;
};

function createEquipmentClassHandler({ equipmentClassService, authMw }: EquipmentClassHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", equipmentClassValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await equipmentClassService.findAll(page, size, filter);
    return c.json(WebResponse.builder<EquipmentClassList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", equipmentClassValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await equipmentClassService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await equipmentClassService.findById(parseInt(id));
    return c.json(WebResponse.builder<EquipmentClass>().data(response).build(), 200);
  });

  app.put("/:id", equipmentClassValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await equipmentClassService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await equipmentClassService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createEquipmentClassHandler };
export type { EquipmentClassHandlerDeps };
