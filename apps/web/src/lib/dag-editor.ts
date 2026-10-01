import { MarkerType } from "@xyflow/react";

import type { Edge, Node } from "@xyflow/react";
import type { EdgeListItem, EquipmentListItem, NodeLayout, WorkUnitListItem } from "./types.js";

// What a machine node needs to draw itself. Equipment and the count total are
// folded in here rather than fetched per node, so the node stays a pure render.
type MachineNodeData = {
  workUnit: WorkUnitListItem;
  equipment: EquipmentListItem[];
  countPointTotal: number;
};

type MachineNode = Node<MachineNodeData, "machine">;

const NODE_DEFAULT_SIZE = { width: 320, height: 300 };

// Every machine created before the editor existed sits at {0,0}, which would
// stack a whole line in one spot. Those fall back to a left-to-right row, which
// is also how a line reads.
const AUTO_STEP_X = NODE_DEFAULT_SIZE.width + 120;

function autoPosition(index: number): NodeLayout {
  return { x: index * AUTO_STEP_X, y: 0 };
}

function hasStoredPosition(position: NodeLayout | undefined): boolean {
  return position !== undefined && (position.x !== 0 || position.y !== 0);
}

function groupEquipmentByUnit(equipment: EquipmentListItem[]): Map<number, EquipmentListItem[]> {
  const byUnit = new Map<number, EquipmentListItem[]>();
  for (const item of equipment) {
    const unitId = item.unit?.id;
    if (unitId === undefined) continue;

    const bucket = byUnit.get(unitId);
    if (bucket) bucket.push(item);
    else byUnit.set(unitId, [item]);
  }
  return byUnit;
}

function toFlowNodes(
  workUnits: WorkUnitListItem[],
  equipmentByUnit: Map<number, EquipmentListItem[]>,
  countPointTotals: Map<number, number>,
): MachineNode[] {
  return workUnits.map((workUnit, index) => {
    const stored = workUnit.position;
    const layout = hasStoredPosition(stored) ? stored : autoPosition(index);

    return {
      id: String(workUnit.id),
      type: "machine" as const,
      position: { x: layout.x, y: layout.y },
      // React Flow reads the controlled size off `style`; the resizer writes it
      // back through the same shape.
      style: {
        width: layout.width ?? NODE_DEFAULT_SIZE.width,
        height: layout.height ?? NODE_DEFAULT_SIZE.height,
      },
      data: {
        workUnit,
        equipment: equipmentByUnit.get(workUnit.id) ?? [],
        countPointTotal: countPointTotals.get(workUnit.id) ?? 0,
      },
    };
  });
}

function toFlowEdges(edges: EdgeListItem[]): Edge[] {
  return edges.flatMap((edge) => {
    // An endpoint the API could not resolve has nothing to draw between.
    if (!edge.from || !edge.to) return [];

    return [
      {
        id: String(edge.id),
        source: String(edge.from.id),
        target: String(edge.to.id),
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ];
  });
}

// Walks downstream from `toId` looking for `fromId`: if the target already feeds
// the source, the new flow would close a loop. Only a fast local guard -- the API
// validates the whole graph and stays authoritative.
function wouldCreateCycle(edges: EdgeListItem[], fromId: number, toId: number): boolean {
  if (fromId === toId) return true;

  const downstream = new Map<number, number[]>();
  for (const edge of edges) {
    if (!edge.from || !edge.to) continue;

    const bucket = downstream.get(edge.from.id);
    if (bucket) bucket.push(edge.to.id);
    else downstream.set(edge.from.id, [edge.to.id]);
  }

  const seen = new Set<number>();
  const queue = [toId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current === fromId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(downstream.get(current) ?? []));
  }

  return false;
}

// Names a flow in confirmations and screen-reader labels, on the canvas and in
// the line detail table alike.
function flowLabel(edge: EdgeListItem): string {
  return `${edge.from?.name ?? "?"} → ${edge.to?.name ?? "?"}`;
}

export {
  autoPosition,
  flowLabel,
  groupEquipmentByUnit,
  NODE_DEFAULT_SIZE,
  toFlowEdges,
  toFlowNodes,
  wouldCreateCycle,
};
export type { MachineNode, MachineNodeData };
