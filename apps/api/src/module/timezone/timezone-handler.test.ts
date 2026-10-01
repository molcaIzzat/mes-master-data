import { describe, it, expect, vi } from "vite-plus/test";
import { createMiddleware } from "hono/factory";

import {
  createWorkCenterTimezoneHandler,
  createWorkUnitTimezoneHandler,
} from "./timezone-handler.js";

import type { AuthEnv } from "@molca/mes";
import type { TTimezoneService } from "./timezone-service.js";

const payload = { siteId: 1, siteCode: "PLANT-A", timezone: "Asia/Jakarta" };

// Auth is exercised by @molca/mes's own tests; here it only has to let the
// request through so the envelope and the id guard can be asserted.
const passthroughAuth = createMiddleware<AuthEnv>(async (_c, next) => {
  await next();
});

function setup() {
  const findByWorkUnitId = vi.fn().mockResolvedValue(payload);
  const findByWorkCenterId = vi.fn().mockResolvedValue(payload);
  const timezoneService = { findByWorkUnitId, findByWorkCenterId } as TTimezoneService;

  return {
    workUnitApp: createWorkUnitTimezoneHandler({ timezoneService, authMw: passthroughAuth }),
    workCenterApp: createWorkCenterTimezoneHandler({ timezoneService, authMw: passthroughAuth }),
    findByWorkUnitId,
    findByWorkCenterId,
  };
}

describe("GET /work-units/:id/timezone", () => {
  it("serves the payload in the standard envelope", async () => {
    const { workUnitApp } = setup();

    const res = await workUnitApp.request("/42/timezone");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ data: payload, error: null });
  });

  it("resolves through the work-unit entry point, not the work-center one", async () => {
    const { workUnitApp, findByWorkUnitId, findByWorkCenterId } = setup();

    await workUnitApp.request("/42/timezone");

    expect(findByWorkUnitId).toHaveBeenCalledWith(42);
    expect(findByWorkCenterId).not.toHaveBeenCalled();
  });

  // The sibling CRUD handlers pass a bare parseInt straight into the query, so a
  // non-numeric id becomes NaN and surfaces as a 500. This route's consumer turns
  // any 5xx into a 503 for its own callers, so it must not reach the service.
  it.for(["abc", "0", "-1", "1.5"])("rejects %s as a 400 without querying", async (id) => {
    const { workUnitApp, findByWorkUnitId } = setup();

    const res = await workUnitApp.request(`/${id}/timezone`);

    expect(res.status).toBe(400);
    expect(findByWorkUnitId).not.toHaveBeenCalled();
  });
});

describe("GET /work-centers/:id/timezone", () => {
  it("serves the payload in the standard envelope", async () => {
    const { workCenterApp } = setup();

    const res = await workCenterApp.request("/7/timezone");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ data: payload, error: null });
  });

  it("resolves through the work-center entry point", async () => {
    const { workCenterApp, findByWorkCenterId, findByWorkUnitId } = setup();

    await workCenterApp.request("/7/timezone");

    expect(findByWorkCenterId).toHaveBeenCalledWith(7);
    expect(findByWorkUnitId).not.toHaveBeenCalled();
  });

  // The mount is a SECOND app on a base that already has CRUD routes. Hono only
  // falls through to it because `app.get("/:id")` cannot match two segments — if
  // that ever stops holding, this route silently disappears.
  it("does not claim the bare /:id route its base already serves", async () => {
    const { workCenterApp } = setup();

    const res = await workCenterApp.request("/7");

    expect(res.status).toBe(404);
  });
});
