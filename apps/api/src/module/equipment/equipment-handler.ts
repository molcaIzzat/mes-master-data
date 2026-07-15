import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { equipmentValidator } from "./equipment-dto.js";

import type { TEquipmentService } from "./equipment-service.js";
import type { Equipment, EquipmentList } from "./equipment.js";

type EquipmentHandlerDeps = {
  equipmentService: TEquipmentService;
  authMw: AuthMiddleware;
};

function createEquipmentHandler({ equipmentService, authMw }: EquipmentHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", equipmentValidator.paginate, async (c) => {
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
    };
    const { items, meta } = await equipmentService.findAll(page, size, filter);
    return c.json(WebResponse.builder<EquipmentList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", equipmentValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await equipmentService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await equipmentService.findById(parseInt(id));
    return c.json(WebResponse.builder<Equipment>().data(response).build(), 200);
  });

  app.put("/:id", equipmentValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await equipmentService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await equipmentService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createEquipmentHandler };
export type { EquipmentHandlerDeps };
