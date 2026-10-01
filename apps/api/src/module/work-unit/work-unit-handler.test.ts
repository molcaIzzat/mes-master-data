import { describe, it, expect, vi } from "vite-plus/test";
import { createMiddleware } from "hono/factory";

import { createWorkUnitHandler } from "./work-unit-handler.js";
import { MAX_IDS } from "./work-unit-dto.js";

import type { AuthEnv } from "@molca/mes";
import type { TWorkUnitService } from "./work-unit-service.js";
import type { TCountPointService } from "../count-point/count-point-service.js";
import type { TOtherPointService } from "../other-point/other-point-service.js";
import type { TProductSpecService } from "../product-work-unit-spec/spec-service.js";
import type { TProductAliasService } from "../product-alias/product-alias-service.js";

const meta = { page: 1, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

// Auth is exercised by @molca/mes's own tests; here it only has to let the
// request through so query validation and the envelope can be asserted.
const passthroughAuth = createMiddleware<AuthEnv>(async (_c, next) => {
  await next();
});

function setup() {
  const findAll = vi.fn().mockResolvedValue({ items: [], meta });
  const app = createWorkUnitHandler({
    workUnitService: { findAll } as unknown as TWorkUnitService,
    countPointService: {} as unknown as TCountPointService,
    otherPointService: {} as unknown as TOtherPointService,
    productSpecService: {} as unknown as TProductSpecService,
    productAliasService: {} as unknown as TProductAliasService,
    authMw: passthroughAuth,
  });
  return { app, findAll };
}

// The filter object the handler builds is what reaches the repository, so these
// assertions pin the whole query -> filter mapping, not just the parsed value.
function filterOf(findAll: ReturnType<typeof vi.fn>) {
  return findAll.mock.calls[0]?.[2];
}

describe("GET /work-units ?ids=", () => {
  it("passes a parsed id list through to the service", async () => {
    const { app, findAll } = setup();

    const res = await app.request("/?ids=4,5,6");

    expect(res.status).toBe(200);
    expect(filterOf(findAll)).toMatchObject({ ids: [4, 5, 6] });
  });

  it("leaves ids undefined when the parameter is absent", async () => {
    const { app, findAll } = setup();

    await app.request("/");

    expect(filterOf(findAll)).toMatchObject({ ids: undefined });
  });

  it("combines ids with workCenterId instead of dropping either", async () => {
    const { app, findAll } = setup();

    const res = await app.request("/?ids=4,5&workCenterId=7");

    expect(res.status).toBe(200);
    expect(filterOf(findAll)).toMatchObject({ ids: [4, 5], workCenterId: 7 });
  });

  it("combines ids with q and type", async () => {
    const { app, findAll } = setup();

    await app.request("/?ids=4&q=packer&type=work_cell");

    expect(filterOf(findAll)).toMatchObject({ ids: [4], q: "packer", type: "work_cell" });
  });

  it("honours pagination alongside ids", async () => {
    const { app, findAll } = setup();

    await app.request("/?ids=4,5&page=2&size=50");

    expect(findAll).toHaveBeenCalledWith(2, 50, expect.objectContaining({ ids: [4, 5] }));
  });

  it("400s on a non-numeric id without reaching the service", async () => {
    const { app, findAll } = setup();

    const res = await app.request("/?ids=4,abc");

    expect(res.status).toBe(400);
    expect(findAll).not.toHaveBeenCalled();
    expect((await res.json()).error).toBe("invalid request");
  });

  it(`400s on more than ${MAX_IDS} ids`, async () => {
    const { app, findAll } = setup();
    const tooMany = Array.from({ length: MAX_IDS + 1 }, (_, i) => i + 1).join(",");

    const res = await app.request(`/?ids=${tooMany}`);

    expect(res.status).toBe(400);
    expect(findAll).not.toHaveBeenCalled();
  });

  it("treats an empty ids parameter as no filter rather than 400", async () => {
    const { app, findAll } = setup();

    const res = await app.request("/?ids=");

    expect(res.status).toBe(200);
    expect(filterOf(findAll)).toMatchObject({ ids: undefined });
  });

  it("returns the standard envelope", async () => {
    const { app } = setup();

    const res = await app.request("/?ids=4");
    const body = await res.json();

    expect(body.error).toBeNull();
    expect(body.data).toEqual([]);
    expect(body.meta).toEqual(meta);
  });
});
