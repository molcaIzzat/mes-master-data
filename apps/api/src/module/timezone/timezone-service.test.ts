import { describe, it, expect, vi } from "vite-plus/test";
import { HTTPException } from "hono/http-exception";

import { OrphanedHierarchyError } from "./timezone-errors.js";
import { TimezoneService } from "./timezone-service.js";

import type { TimezoneReader } from "./timezone-repository.js";
import type { WorkCenterChain, WorkUnitChain } from "./timezone.js";

const site = { id: 1, code: "PLANT-A", timezone: "Asia/Jakarta" };

function setup(chain: {
  workUnit?: WorkUnitChain | undefined;
  workCenter?: WorkCenterChain | undefined;
}) {
  const findWorkUnitChain = vi.fn().mockResolvedValue(chain.workUnit);
  const findWorkCenterChain = vi.fn().mockResolvedValue(chain.workCenter);
  const service = new TimezoneService({
    timezoneReaderRepository: { findWorkUnitChain, findWorkCenterChain } as TimezoneReader,
  });
  return { service, findWorkUnitChain, findWorkCenterChain };
}

describe("TimezoneService.findByWorkUnitId", () => {
  it("returns only the three fields the contract promises", async () => {
    const { service } = setup({
      workUnit: { id: 42, workCenter: { id: 7, area: { id: 3, site } } },
    });

    const result = await service.findByWorkUnitId(42);

    // toEqual, not toMatchObject: an extra field here would leak an internal id
    // onto a cross-service wire contract.
    expect(result).toEqual({ siteId: 1, siteCode: "PLANT-A", timezone: "Asia/Jakarta" });
  });

  it("404s when the work unit does not exist", async () => {
    const { service } = setup({ workUnit: undefined });

    await expect(service.findByWorkUnitId(42)).rejects.toSatisfy(
      (err: unknown) => err instanceof HTTPException && err.status === 404,
    );
  });

  // Each level is its own case: a `?.` chain would collapse all three into one
  // null and lose which link is actually broken, which is the only useful part
  // of the log line an operator gets.
  it.for([
    ["work center", { id: 42, workCenter: null }],
    ["area", { id: 42, workCenter: { id: 7, area: null } }],
    ["site", { id: 42, workCenter: { id: 7, area: { id: 3, site: null } } }],
  ] as [string, WorkUnitChain][])(
    "reports a broken %s link as an orphaned hierarchy",
    async ([brokenLink, workUnit]) => {
      const { service } = setup({ workUnit });

      await expect(service.findByWorkUnitId(42)).rejects.toSatisfy(
        (err: unknown) => err instanceof OrphanedHierarchyError && err.brokenLink === brokenLink,
      );
    },
  );
});

describe("TimezoneService.findByWorkCenterId", () => {
  it("resolves without walking through work units", async () => {
    const { service, findWorkUnitChain } = setup({
      workCenter: { id: 7, area: { id: 3, site } },
    });

    const result = await service.findByWorkCenterId(7);

    expect(result).toEqual({ siteId: 1, siteCode: "PLANT-A", timezone: "Asia/Jakarta" });
    expect(findWorkUnitChain).not.toHaveBeenCalled();
  });

  it("404s when the work center does not exist", async () => {
    const { service } = setup({ workCenter: undefined });

    await expect(service.findByWorkCenterId(7)).rejects.toSatisfy(
      (err: unknown) => err instanceof HTTPException && err.status === 404,
    );
  });

  it.for([
    ["area", { id: 7, area: null }],
    ["site", { id: 7, area: { id: 3, site: null } }],
  ] as [string, WorkCenterChain][])(
    "reports a broken %s link as an orphaned hierarchy",
    async ([brokenLink, workCenter]) => {
      const { service } = setup({ workCenter });

      await expect(service.findByWorkCenterId(7)).rejects.toSatisfy(
        (err: unknown) => err instanceof OrphanedHierarchyError && err.brokenLink === brokenLink,
      );
    },
  );
});
