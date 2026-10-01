import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import {
  listWorkUnitInputSchema,
  MAX_IDS,
  updateCountPointSchema,
  updateWorkUnitSchema,
} from "./work-unit-dto.js";

// The repository writes every key that survives parsing, so a key the client
// never sent must not appear in the parsed patch -- otherwise a PUT that carries
// one field blanks the columns it said nothing about. `.partial()` over a schema
// with `z._default(...)` fields does exactly that, which is why the update
// schemas are built off the plain fields.
describe("updateWorkUnitSchema", () => {
  it("keeps a position-only body to just the position", () => {
    const patch = z.parse(updateWorkUnitSchema, { position: { x: 10, y: 20 } });

    expect(Object.keys(patch)).toEqual(["position"]);
  });

  it("does not invent a null class or telemetry tags", () => {
    const patch = z.parse(updateWorkUnitSchema, {
      position: { x: 1, y: 2, width: 400, height: 320 },
    });

    expect("workUnitClassId" in patch).toBe(false);
    expect("telemetryTags" in patch).toBe(false);
  });

  it("still accepts an explicit null when the client means to clear a field", () => {
    const patch = z.parse(updateWorkUnitSchema, { workUnitClassId: null });

    expect(patch).toEqual({ workUnitClassId: null });
  });

  it("carries the node size through", () => {
    const position = { x: -30.5, y: 12, width: 468, height: 362 };

    expect(z.parse(updateWorkUnitSchema, { position })).toEqual({ position });
  });

  it("still validates the fields it is given", () => {
    expect(() => z.parse(updateWorkUnitSchema, { code: "abc" })).toThrow();
    expect(() => z.parse(updateWorkUnitSchema, { position: { x: 0 } })).toThrow();
  });
});

describe("updateCountPointSchema", () => {
  it("does not fall back to the plc source on a partial body", () => {
    const patch = z.parse(updateCountPointSchema, { sourceTag: "PLC/tag/one" });

    expect(Object.keys(patch)).toEqual(["sourceTag"]);
  });
});

// `?ids=` is the bulk-lookup entry point for cross-service callers. Everything
// here guards one of two failure shapes: an empty list reaching the repository
// (where it would become an `IN ()`), or a malformed list being silently
// ignored and returning every work unit in the region.
describe("listWorkUnitInputSchema ids", () => {
  function parseIds(ids?: string) {
    return z.parse(listWorkUnitInputSchema, ids === undefined ? {} : { ids }).ids;
  }

  it("is undefined when the parameter is absent", () => {
    expect(parseIds()).toBeUndefined();
  });

  it.each([
    ["an empty string", ""],
    ["a lone separator", ","],
    ["separators and whitespace only", " , , "],
  ])("is undefined for %s, never an empty array", (_label, raw) => {
    expect(parseIds(raw)).toBeUndefined();
  });

  it("parses a comma-separated list", () => {
    expect(parseIds("1,2,3")).toEqual([1, 2, 3]);
  });

  it("tolerates whitespace around each value", () => {
    expect(parseIds(" 1 , 2 ,3 ")).toEqual([1, 2, 3]);
  });

  it("ignores a trailing separator", () => {
    expect(parseIds("1,2,")).toEqual([1, 2]);
  });

  it("preserves the caller's order", () => {
    expect(parseIds("9,3,7")).toEqual([9, 3, 7]);
  });

  it("deduplicates repeated ids", () => {
    expect(parseIds("1,1,2,1")).toEqual([1, 2]);
  });

  it.each([
    ["a non-numeric value", "abc"],
    ["a non-numeric value among valid ones", "1,abc,3"],
    ["zero", "0"],
    ["a negative id", "-1"],
    ["a fractional id", "1.5"],
    ["an empty-ish NaN value", "1,x"],
  ])("rejects %s", (_label, raw) => {
    expect(() => parseIds(raw)).toThrow();
  });

  it(`accepts exactly ${MAX_IDS} ids`, () => {
    const raw = Array.from({ length: MAX_IDS }, (_, i) => i + 1).join(",");

    expect(parseIds(raw)).toHaveLength(MAX_IDS);
  });

  it(`rejects more than ${MAX_IDS} ids`, () => {
    const raw = Array.from({ length: MAX_IDS + 1 }, (_, i) => i + 1).join(",");

    expect(() => parseIds(raw)).toThrow();
  });

  // Dedup runs before the cap, so a caller that repeats ids is not punished for
  // it — what matters is the number of DISTINCT ids actually queried.
  it(`accepts over ${MAX_IDS} values when duplicates collapse under the cap`, () => {
    const raw = Array.from({ length: MAX_IDS + 20 }, (_, i) => (i % MAX_IDS) + 1).join(",");

    expect(parseIds(raw)).toHaveLength(MAX_IDS);
  });

  it("coexists with the other list filters", () => {
    const parsed = z.parse(listWorkUnitInputSchema, {
      ids: "4,5",
      workCenterId: "7",
      type: "work_cell",
      page: "2",
      size: "50",
    });

    expect(parsed).toMatchObject({
      ids: [4, 5],
      workCenterId: 7,
      type: "work_cell",
      page: 2,
      size: 50,
    });
  });
});
