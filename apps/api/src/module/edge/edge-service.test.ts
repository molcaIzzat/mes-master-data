import { describe, it, expect } from "vite-plus/test";

import { validateGraph } from "./edge-service.js";

import type { GraphEdge, GraphNode } from "./edge-service.js";

// Machines are named by code in every error, so the fixtures keep ids and codes
// aligned: id 1 is "M1".
function machines(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, code: `M${i + 1}` }));
}

function flow(from: number, to: number): GraphEdge {
  return { fromWorkUnitId: from, toWorkUnitId: to };
}

describe("validateGraph", () => {
  it("accepts an empty graph", () => {
    expect(validateGraph([], [])).toEqual({ ok: true, errors: [] });
  });

  it("accepts machines with no flows", () => {
    expect(validateGraph(machines(3), []).ok).toBe(true);
  });

  it("accepts a straight chain", () => {
    expect(validateGraph(machines(3), [flow(1, 2), flow(2, 3)]).ok).toBe(true);
  });

  it("accepts a diamond -- two paths rejoining is not a loop", () => {
    const result = validateGraph(machines(4), [flow(1, 2), flow(1, 3), flow(2, 4), flow(3, 4)]);
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it("accepts several disconnected chains", () => {
    expect(validateGraph(machines(4), [flow(1, 2), flow(3, 4)]).ok).toBe(true);
  });

  it("rejects a two-machine loop", () => {
    const result = validateGraph(machines(2), [flow(1, 2), flow(2, 1)]);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.code).toBe("CYCLE");
    expect(result.errors[0]?.workUnitCodes.toSorted()).toEqual(["M1", "M2"]);
    expect(result.errors[0]?.message).toContain("loop");
  });

  it("rejects a three-machine loop and names every machine on it", () => {
    const result = validateGraph(machines(3), [flow(1, 2), flow(2, 3), flow(3, 1)]);

    expect(result.errors[0]?.code).toBe("CYCLE");
    expect(result.errors[0]?.workUnitCodes.toSorted()).toEqual(["M1", "M2", "M3"]);
  });

  it("finds a loop that sits behind an entry machine", () => {
    // M1 feeds the loop but is not on it, so Kahn's algorithm settles M1 first.
    const result = validateGraph(machines(4), [flow(1, 2), flow(2, 3), flow(3, 4), flow(4, 2)]);

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.workUnitCodes.toSorted()).toEqual(["M2", "M3", "M4"]);
  });

  it("finds a loop when a machine merely hangs off it", () => {
    // M3 survives Kahn's algorithm only because it sits downstream of the loop;
    // starting the walk there dead-ends, so every survivor has to be tried.
    const result = validateGraph(machines(3), [flow(1, 2), flow(2, 1), flow(2, 3)]);

    expect(result.errors[0]?.code).toBe("CYCLE");
    expect(result.errors[0]?.workUnitCodes.toSorted()).toEqual(["M1", "M2"]);
  });

  it("rejects an edge pointing at a machine of another line", () => {
    const result = validateGraph(machines(2), [flow(1, 99)]);

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("DANGLING_EDGE");
    // Only the endpoint that is on this line can be named.
    expect(result.errors[0]?.workUnitCodes).toEqual(["M1"]);
  });

  it("keeps checking for loops among the remaining flows", () => {
    const result = validateGraph(machines(3), [flow(1, 99), flow(1, 2), flow(2, 1)]);

    expect(result.errors.map((e) => e.code).toSorted()).toEqual(["CYCLE", "DANGLING_EDGE"]);
  });
});
