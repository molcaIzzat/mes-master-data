import { useEffect } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import { MachineNode } from "@/components/dag-editor/machine-node.js";

import type { Edge } from "@xyflow/react";
import type { MachineNode as MachineNodeType } from "@/lib/dag-editor.js";
import type { NodeLayout } from "@/lib/types.js";

import "@xyflow/react/dist/style.css";

// Module constant on purpose: a fresh object here would remount every node on
// every render.
const NODE_TYPES = { machine: MachineNode };

// Controlled sizes live on `style`; a node that has never been resized falls back
// to whatever React Flow measured.
function nodeSize(node: MachineNodeType): { width?: number; height?: number } {
  const width = node.style?.width;
  const height = node.style?.height;

  return {
    width: typeof width === "number" ? width : node.measured?.width,
    height: typeof height === "number" ? height : node.measured?.height,
  };
}

type DagCanvasProps = {
  nodes: MachineNodeType[];
  edges: Edge[];
  connectMode: boolean;
  onNodeMoved: (workUnitId: number, layout: NodeLayout) => void;
  onConnectMachines: (fromWorkUnitId: number, toWorkUnitId: number) => void;
  onEdgeSelect: (edgeId: number) => void;
};

// The graph itself. React Flow keeps its own copy of the nodes so it can animate
// a drag; the derived arrays are pushed back in whenever the queries behind them
// change, which never happens mid-gesture.
function DagCanvas({
  nodes,
  edges,
  connectMode,
  onNodeMoved,
  onConnectMachines,
  onEdgeSelect,
}: DagCanvasProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<MachineNodeType>(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>(edges);

  useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  // Sized by the parent: React Flow fills whatever box it is given.
  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={(_event, node) => {
        onNodeMoved(Number(node.id), {
          x: node.position.x,
          y: node.position.y,
          ...nodeSize(node),
        });
      }}
      onConnect={(connection) => {
        onConnectMachines(Number(connection.source), Number(connection.target));
      }}
      onEdgeClick={(_event, edge) => onEdgeSelect(Number(edge.id))}
      // In connect mode a drag from a node draws a flow; otherwise it moves the
      // machine. One gesture cannot mean both.
      nodesDraggable={!connectMode}
      nodesConnectable={connectMode}
      // Every delete goes through a confirmation, so the keyboard shortcut that
      // would bypass one is off.
      deleteKeyCode={null}
      // Pinned to light because the app is: "system" would put React Flow's own
      // `dark` class on the canvas, which trips the Tailwind dark variant inside
      // it while the inherited text colour stays light-mode -- unstyled text on a
      // node then goes near-black on near-black.
      colorMode="light"
      fitView
      minZoom={0.2}
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}

export { DagCanvas };
