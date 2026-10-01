import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import { listDowntimeReasonInputSchema } from "./downtime-reason-dto.js";

// `workCenterId` scopes the reason list to one line, and mes-oee-monitor's
// downtime edit dialog depends on it: without the filter, upstream answers with
// the whole REGION's catalogue and an operator recording a stop on the filler is
// offered the palletiser's reasons. The first reason on a stop is the key the
// Availability Pareto groups it under, so that is a data error, not a cosmetic
// one.
//
// The parsing shape below is what the repository's semi-join keys off, so these
// cases pin the boundary between "no filter" and "filter by line".
describe("listDowntimeReasonInputSchema", () => {
  it("coerces workCenterId from the query string, which only ever carries text", () => {
    const parsed = z.parse(listDowntimeReasonInputSchema, { workCenterId: "13" });

    expect(parsed.workCenterId).toBe(13);
  });

  it("treats an absent workCenterId as no filter", () => {
    const parsed = z.parse(listDowntimeReasonInputSchema, {});

    expect(parsed.workCenterId).toBeUndefined();
  });

  // `0` is what a caller sends for "nothing selected yet", and it must mean the
  // same as omitting the param — otherwise the repository would filter on line
  // zero and answer with an empty picker rather than an unfiltered one. Same
  // transform `areaId` already carries, asserted here so the two cannot drift.
  it("folds workCenterId=0 to no filter, matching areaId", () => {
    const parsed = z.parse(listDowntimeReasonInputSchema, { workCenterId: "0", areaId: "0" });

    expect(parsed.workCenterId).toBeUndefined();
    expect(parsed.areaId).toBeUndefined();
  });

  // The two junction tables are independent — a reason may be attached to a line
  // without its area — so the filters must survive together rather than one
  // superseding the other.
  it("keeps areaId and workCenterId as independent filters", () => {
    const parsed = z.parse(listDowntimeReasonInputSchema, { areaId: "2", workCenterId: "13" });

    expect(parsed.areaId).toBe(2);
    expect(parsed.workCenterId).toBe(13);
  });
});
