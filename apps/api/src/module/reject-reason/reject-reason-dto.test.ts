import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import { listRejectReasonInputSchema } from "./reject-reason-dto.js";

// `workCenterId` scopes the reject-reason list to one line, and mes-oee-monitor's
// reject/rework entry dialog depends on it: without the filter, upstream answers
// with the whole REGION's catalogue and an operator recording a reject on one line
// is offered another line's reasons. The reason is what the Quality Pareto groups
// on, so that is a data error, not a cosmetic one — the same argument the
// downtime-reason filter shipped with, one catalogue over.
//
// The junction data was always there: `workCenterIds` is REQUIRED on create. Only
// the read filter was missing.
//
// The parsing shape below is what the repository's semi-join keys off, so these
// cases pin the boundary between "no filter" and "filter by line".
describe("listRejectReasonInputSchema", () => {
  it("coerces workCenterId from the query string, which only ever carries text", () => {
    const parsed = z.parse(listRejectReasonInputSchema, { workCenterId: "13" });

    expect(parsed.workCenterId).toBe(13);
  });

  it("treats an absent workCenterId as no filter", () => {
    const parsed = z.parse(listRejectReasonInputSchema, {});

    expect(parsed.workCenterId).toBeUndefined();
  });

  // `0` is what a caller sends for "nothing selected yet", and it must mean the
  // same as omitting the param — otherwise the repository would filter on line
  // zero and answer with an empty picker rather than an unfiltered one. An empty
  // picker is the worse failure here: it reads as "this line has no reject
  // reasons", which is a claim about the catalogue rather than about the filter.
  it("folds workCenterId=0 to no filter, matching areaId", () => {
    const parsed = z.parse(listRejectReasonInputSchema, { workCenterId: "0", areaId: "0" });

    expect(parsed.workCenterId).toBeUndefined();
    expect(parsed.areaId).toBeUndefined();
  });

  // The two junction tables are independent — a reason may be attached to a line
  // without its area — so the filters must survive together rather than one
  // superseding the other.
  it("keeps areaId and workCenterId as independent filters", () => {
    const parsed = z.parse(listRejectReasonInputSchema, { areaId: "2", workCenterId: "13" });

    expect(parsed.areaId).toBe(2);
    expect(parsed.workCenterId).toBe(13);
  });
});
