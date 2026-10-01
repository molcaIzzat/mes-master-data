import { describe, it, expect } from "vite-plus/test";

import {
  autoPosition,
  flowLabel,
  groupEquipmentByUnit,
  NODE_DEFAULT_SIZE,
  toFlowEdges,
  toFlowNodes,
  wouldCreateCycle,
} from "./dag-editor.js";

import type { EdgeListItem, EquipmentListItem, NodeLayout, WorkUnitListItem } from "./types.js";

function machine(id: number, position: NodeLayout = { x: 0, y: 0 }): WorkUnitListItem {
  return { id, code: `M${id}`, name: `Machine ${id}`, class: null, position };
}

function equipment(id: number, unitId: number | null): EquipmentListItem {
  return {
    id,
    code: `E${id}`,
    name: `Equipment ${id}`,
    unit: unitId === null ? null : { id: unitId, name: `Machine ${unitId}`, code: `M${unitId}` },
    class: null,
    productSignalTag: "",
  };
}

function flow(id: number, from: number, to: number): EdgeListItem {
  return {
    id,
    workCenterId: 1,
    from: { id: from, code: `M${from}`, name: `Machine ${from}` },
    to: { id: to, code: `M${to}`, name: `Machine ${to}` },
  };
}

describe("autoPosition", () => {
  it("lays machines out left to right", () => {
    expect(autoPosition(0)).toEqual({ x: 0, y: 0 });
    expect(autoPosition(2).x).toBeGreaterThan(autoPosition(1).x);
    expect(autoPosition(3).y).toBe(0);
  });
});

describe("toFlowNodes", () => {
  it("falls back to a row for machines still parked at the origin", () => {
    const nodes = toFlowNodes([machine(1), machine(2)], new Map(), new Map());

    expect(nodes[0]?.position).toEqual(autoPosition(0));
    expect(nodes[1]?.position).toEqual(autoPosition(1));
  });

  it("keeps a stored position", () => {
    const nodes = toFlowNodes([machine(1, { x: 40, y: 90 })], new Map(), new Map());

    expect(nodes[0]?.position).toEqual({ x: 40, y: 90 });
  });

  it("uses the default size until a node has been resized", () => {
    const [plain, sized] = toFlowNodes(
      [machine(1, { x: 10, y: 10 }), machine(2, { x: 20, y: 20, width: 500, height: 400 })],
      new Map(),
      new Map(),
    );

    expect(plain?.style).toEqual(NODE_DEFAULT_SIZE);
    expect(sized?.style).toEqual({ width: 500, height: 400 });
  });

  it("hands each node its own equipment and count total", () => {
    const nodes = toFlowNodes(
      [machine(1), machine(2)],
      groupEquipmentByUnit([equipment(10, 1), equipment(11, 1), equipment(12, 2)]),
      new Map([[1, 100]]),
    );

    expect(nodes[0]?.data.equipment.map((e) => e.id)).toEqual([10, 11]);
    expect(nodes[0]?.data.countPointTotal).toBe(100);
    expect(nodes[1]?.data.equipment.map((e) => e.id)).toEqual([12]);
    // A machine nobody counted reads as zero, not as missing.
    expect(nodes[1]?.data.countPointTotal).toBe(0);
  });
});

describe("groupEquipmentByUnit", () => {
  it("drops equipment with no machine", () => {
    const grouped = groupEquipmentByUnit([equipment(10, null), equipment(11, 1)]);

    expect(grouped.size).toBe(1);
    expect(grouped.get(1)?.map((e) => e.id)).toEqual([11]);
  });
});

describe("toFlowEdges", () => {
  it("maps endpoints to node ids and adds an arrowhead", () => {
    const [edge] = toFlowEdges([flow(7, 1, 2)]);

    expect(edge?.id).toBe("7");
    expect(edge?.source).toBe("1");
    expect(edge?.target).toBe("2");
    expect(edge?.markerEnd).toBeDefined();
  });

  it("skips a flow whose endpoint could not be resolved", () => {
    expect(toFlowEdges([{ id: 1, workCenterId: 1, from: null, to: null }])).toEqual([]);
  });
});

describe("wouldCreateCycle", () => {
  it("refuses a machine feeding itself", () => {
    expect(wouldCreateCycle([], 1, 1)).toBe(true);
  });

  it("refuses the reverse of an existing flow", () => {
    expect(wouldCreateCycle([flow(1, 1, 2)], 2, 1)).toBe(true);
  });

  it("refuses a flow that closes a longer chain", () => {
    const edges = [flow(1, 1, 2), flow(2, 2, 3)];

    expect(wouldCreateCycle(edges, 3, 1)).toBe(true);
  });

  it("allows a flow that only extends the chain", () => {
    expect(wouldCreateCycle([flow(1, 1, 2)], 2, 3)).toBe(false);
  });

  it("allows two paths rejoining", () => {
    const edges = [flow(1, 1, 2), flow(2, 1, 3), flow(3, 2, 4)];

    expect(wouldCreateCycle(edges, 3, 4)).toBe(false);
  });

  it("survives a graph that is already looped", () => {
    const edges = [flow(1, 1, 2), flow(2, 2, 1)];

    expect(wouldCreateCycle(edges, 2, 3)).toBe(false);
  });
});

describe("flowLabel", () => {
  it("names both ends", () => {
    expect(flowLabel(flow(1, 1, 2))).toBe("Machine 1 → Machine 2");
  });

  it("marks an unresolved end", () => {
    expect(flowLabel({ id: 1, workCenterId: 1, from: null, to: null })).toBe("? → ?");
  });
});
