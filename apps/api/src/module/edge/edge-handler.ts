import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { TEdgeService } from "./edge-service.js";
import { Hono } from "hono";
import { edgeValidator } from "./edge-dto.js";
import { WebResponse } from "@molca/network";
import type { EdgeList } from "./edge.js";

type EdgeHandlerDeps = {
  edgeService: TEdgeService;
  authMw: AuthMiddleware;
};

function createEdgeHandler({ edgeService, authMw }: EdgeHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/:id/edges", async (c) => {
    const workCenterId = c.req.param("id");
    const resp = await edgeService.findAll(parseInt(workCenterId));
    return c.json(WebResponse.builder<EdgeList[]>().data(resp).build(), 200);
  });

  app.post("/:id/edges", edgeValidator.create, async (c) => {
    const workCenterId = c.req.param("id");
    const body = c.req.valid("json");
    const response = await edgeService.create({ ...body, workCenterId: parseInt(workCenterId) });
    return c.json(WebResponse.builder<{ id: number }>().data(response).build(), 201);
  });

  app.delete("/:workCenterId/edges/:edgeId", async (c) => {
    const { workCenterId, edgeId } = c.req.param();
    const deleted = await edgeService.delete(parseInt(workCenterId), parseInt(edgeId));
    return c.json(WebResponse.builder<string>().data(deleted).build(), 200);
  });

  return app;
}

export { createEdgeHandler };
export type { EdgeHandlerDeps };
