import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { WebResponse } from "@molca/network";

import type { AuthEnv, AuthMiddleware } from "@molca/mes";

import type { SiteTimezone } from "./timezone.js";
import type { TTimezoneService } from "./timezone-service.js";

// Two factories rather than one, because the same path — /:id/timezone — has to
// hang off two different bases. Each is mounted as an ADDITIONAL Hono app on a
// base that already has a handler, exactly as createEdgeHandler is mounted on
// /work-centers alongside createWorkCenterHandler: Hono falls through to the next
// mounted app when the first has no matching route, and `app.get("/:id")` cannot
// match a two-segment path. So there is no ordering hazard with the CRUD routes.

type TimezoneHandlerDeps = {
  timezoneService: TTimezoneService;
  authMw: AuthMiddleware;
};

// The sibling handlers do a bare `parseInt(...)`, which sends NaN into the query
// and surfaces as a 500. This route's only consumer turns any 5xx into a 503 for
// its own callers, so a malformed id is worth rejecting as the 400 it is.
function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: `invalid id: "${raw}"` });
  }
  return id;
}

function createWorkUnitTimezoneHandler({ timezoneService, authMw }: TimezoneHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/:id/timezone", async (c) => {
    const id = parseId(c.req.param("id"));
    const response = await timezoneService.findByWorkUnitId(id);
    return c.json(WebResponse.builder<SiteTimezone>().data(response).build(), 200);
  });

  return app;
}

function createWorkCenterTimezoneHandler({ timezoneService, authMw }: TimezoneHandlerDeps) {
  const app = new Hono<AuthEnv>();

  app.use("*", authMw);

  app.get("/:id/timezone", async (c) => {
    const id = parseId(c.req.param("id"));
    const response = await timezoneService.findByWorkCenterId(id);
    return c.json(WebResponse.builder<SiteTimezone>().data(response).build(), 200);
  });

  return app;
}

export { createWorkCenterTimezoneHandler, createWorkUnitTimezoneHandler };
export type { TimezoneHandlerDeps };
