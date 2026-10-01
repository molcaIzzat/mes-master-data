import { createContext, useContext } from "react";

import type { NodeLayout } from "@/lib/types.js";

// What a machine node needs from the editor around it. It travels by context
// rather than in the node's `data` so `nodeTypes` can stay a module constant and
// the nodes are not rebuilt every time a callback identity changes.
type DagEditorContextValue = {
  // While on, dragging a node draws a connection instead of moving it.
  connectMode: boolean;
  selectMachine: (workUnitId: number) => void;
  selectEquipment: (workUnitId: number, equipmentId: number) => void;
  saveLayout: (workUnitId: number, layout: NodeLayout) => void;
};

const DagEditorContext = createContext<DagEditorContextValue | null>(null);

function useDagEditor(): DagEditorContextValue {
  const value = useContext(DagEditorContext);
  if (!value) throw new Error("useDagEditor must be used inside the DAG editor");
  return value;
}

export { DagEditorContext, useDagEditor };
export type { DagEditorContextValue };
