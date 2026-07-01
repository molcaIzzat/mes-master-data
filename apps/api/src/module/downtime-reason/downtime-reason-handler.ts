import type { AuthEnv, AuthMiddleware } from "@molca/security";
import type { TDowntimeReasonService } from "./downtime-reason-service.js";
import { Hono } from "hono";
import { downtimeReasonValidator } from "./downtime-reason-dto.js";
import { WebResponse } from "@molca/network";
import type { DowntimeReasonEnriched, DowntimeReasonEnrichedList } from "./downtime-reason.js";

type DowntimeReasonHandlerDeps = {
  downtimeReasonService: TDowntimeReasonService;
  authMw: AuthMiddleware;
};

function createDowntimeReasonHandler({ downtimeReasonService, authMw }: DowntimeReasonHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/", downtimeReasonValidator.paginate, async (c) => {
    const { page, size, q, areaId, category } = c.req.valid("query");
    const filter = {
      q,
      areaId,
      category,
    };
    const { items, meta } = await downtimeReasonService.findAll(page, size, filter);
    return c.json(
      WebResponse.builder<DowntimeReasonEnrichedList[]>().data(items).meta(meta).build(),
      200,
    );
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const response = await downtimeReasonService.findById(parseInt(id));
    return c.json(WebResponse.builder<DowntimeReasonEnriched>().data(response).build(), 200);
  });

  return app;
}

export { createDowntimeReasonHandler };
export type { DowntimeReasonHandlerDeps };
