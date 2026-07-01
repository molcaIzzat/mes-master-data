import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { TRejectReasonService } from "./reject-reason-service.js";
import { Hono } from "hono";
import { rejectReasonValidator } from "./reject-reason-dto.js";
import { WebResponse } from "@molca/network";
import type { RejectReasonEnriched, RejectReasonEnrichedList } from "./reject-reason.js";

type RejectReasonHandlerDeps = {
  rejectReasonService: TRejectReasonService;
  authMw: AuthMiddleware;
};

function createRejectReasonHandler({ rejectReasonService, authMw }: RejectReasonHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", rejectReasonValidator.paginate, async (c) => {
    const { page, size, q, areaId } = c.req.valid("query");
    const filter = {
      q,
      areaId,
    };
    const { items, meta } = await rejectReasonService.findAll(page, size, filter);
    return c.json(
      WebResponse.builder<RejectReasonEnrichedList[]>().data(items).meta(meta).build(),
      200,
    );
  });

  app.post("/", rejectReasonValidator.create, async (c) => {
    const input = c.req.valid("json");
    const resp = await rejectReasonService.create(input);
    return c.json(WebResponse.builder<{ id: number }>().data(resp).build(), 201);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await rejectReasonService.findById(parseInt(id));
    return c.json(WebResponse.builder<RejectReasonEnriched>().data(response).build(), 200);
  });

  app.put("/:id", rejectReasonValidator.update, async (c) => {
    const id = c.req.param("id");
    const patch = c.req.valid("json");
    const resp = await rejectReasonService.update(parseInt(id), patch);
    return c.json(WebResponse.builder<{ id: number }>().data(resp).build(), 200);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const resp = await rejectReasonService.delete(parseInt(id));
    return c.json(WebResponse.builder<string>().data(resp).build(), 200);
  });

  return app;
}

export { createRejectReasonHandler };
export type { RejectReasonHandlerDeps };
