import { Hono } from "hono";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/security";

import { machineValidator } from "./machine-dto.js";

import type { Machine, MachineList, SubMachine, SubMachineList } from "./machine.js";
import type { TMachineService } from "./machine-service.js";

type MachineHandlerDeps = {
  machineService: TMachineService;
  authMw: AuthMiddleware;
};

function createMachineHandler({ machineService, authMw }: MachineHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", machineValidator.paginate, async (c) => {
    const { page, size, q, lineId, isMain } = c.req.valid("query");
    const filter = {
      q,
      lineId,
      isMain,
    };
    const { items, meta } = await machineService.findAll(page, size, filter);
    return c.json(WebResponse.builder<MachineList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/", machineValidator.create, async (c) => {
    const body = c.req.valid("json");
    const response = await machineService.create({ ...body });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await machineService.findById(parseInt(id));
    return c.json(WebResponse.builder<Machine>().data(response).build(), 200);
  });

  app.put("/:id", machineValidator.update, async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const response = await machineService.update(parseInt(id), body);
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await machineService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  app.get("/:id/subs", machineValidator.paginateSub, async (c) => {
    const machineId = c.req.param("id");
    const { page, size, q } = c.req.valid("query");
    const filter = {
      q,
      machineId: parseInt(machineId),
    };
    const { items, meta } = await machineService.findAllSub(page, size, filter);
    return c.json(WebResponse.builder<SubMachineList[]>().data(items).meta(meta).build(), 200);
  });

  app.post("/:id/subs", machineValidator.createSub, async (c) => {
    const machineId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await machineService.createSub({ ...body, machineId: parseInt(machineId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.get("/:id/subs/:subId", async (c) => {
    const id = c.req.param("subId");
    const response = await machineService.findSubById(parseInt(id));
    return c.json(WebResponse.builder<SubMachine>().data(response).build(), 200);
  });

  app.put("/:id/subs/:subId", machineValidator.updateSub, async (c) => {
    const machineId = c.req.param("id");
    const id = c.req.param("subId");
    const body = c.req.valid("json");
    const response = await machineService.updateSub(parseInt(id), {
      ...body,
      machineId: parseInt(machineId),
    });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 200);
  });

  app.delete("/:id/subs/:subId", async (c) => {
    const id = c.req.param("subId");
    const deleted = await machineService.deleteSub(parseInt(id));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createMachineHandler };
export type { MachineHandlerDeps };
