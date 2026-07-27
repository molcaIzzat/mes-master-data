import { describe, it, expect, vi } from "vite-plus/test";
import { createMiddleware } from "hono/factory";

import { createLevelConfigurationHandler } from "./level-configuration-handler.js";

import type { AuthEnv } from "@molca/security";
import type { TLevelConfigurationService } from "./level-configuration-service.js";
import type { LevelLine } from "./level-configuration.js";

const line: LevelLine = {
  id: 12,
  code: "WC-03",
  name: "Molca Line 3",
  area: { id: 3, code: "FH-2", name: "FH-2" },
  class: { id: 1, code: "PKG", name: "PACKAGE" },
  workUnits: [
    {
      id: 44,
      code: "WU-P1",
      name: "Molca Packer P",
      class: { id: 5, code: "packer", name: "Packer" },
      equipments: [
        {
          id: 92,
          code: "EQ-WGH-1",
          name: "Weigher",
          class: { id: 2, code: "weigher", name: "Weigher" },
          productSignalTag: "PLC/L3/EQ-WGH-1/Product_Code",
        },
      ],
    },
  ],
};

const meta = {
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

// Auth is exercised by @molca/security's own tests; here it just has to let the
// request through so the query validation and envelope can be asserted.
const passthroughAuth = createMiddleware<AuthEnv>(async (_c, next) => {
  await next();
});

function setup(items: LevelLine[] = [line]) {
  const findAll = vi.fn().mockResolvedValue({ items, meta });
  const levelConfigurationService = { findAll } as unknown as TLevelConfigurationService;
  const app = createLevelConfigurationHandler({
    levelConfigurationService,
    authMw: passthroughAuth,
  });
  return { app, findAll };
}

describe("GET /level-configurations", () => {
  it("applies the shared pagination defaults when no query is given", async () => {
    const { app, findAll } = setup();

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(findAll).toHaveBeenCalledWith(1, 10, { q: undefined, areaId: undefined });
  });

  it("returns the nested tree inside the standard envelope", async () => {
    const { app } = setup();

    const res = await app.request("/");
    const body = await res.json();

    expect(body.error).toBeNull();
    expect(body.meta).toEqual(meta);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].class.name).toBe("PACKAGE"); // the Category column
    expect(body.data[0].workUnits[0].equipments[0].code).toBe("EQ-WGH-1");
  });

  it("passes page, size and filters through to the service", async () => {
    const { app, findAll } = setup();

    await app.request("/?page=2&size=25&q=weigher&areaId=3");
    expect(findAll).toHaveBeenCalledWith(2, 25, { q: "weigher", areaId: 3 });
  });

  it("treats the web's empty-string and zero sentinels as no filter", async () => {
    const { app, findAll } = setup();

    await app.request("/?q=&areaId=0");
    expect(findAll).toHaveBeenCalledWith(1, 10, { q: undefined, areaId: undefined });
  });

  it("rejects a size above the shared maximum", async () => {
    const { app, findAll } = setup();

    const res = await app.request("/?size=101");
    expect(res.status).toBe(400);
    expect(findAll).not.toHaveBeenCalled();
  });

  it("still returns a well-formed envelope when nothing matches", async () => {
    const { app } = setup([]);

    const res = await app.request("/?q=nothing-matches-this");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.error).toBeNull();
  });
});
