import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import { updateCountPointSchema, updateWorkUnitSchema } from "./work-unit-dto.js";

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
