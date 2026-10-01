import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";

import {
  useCountPointTotals,
  useCreateEdge,
  useEdges,
  useEquipmentsByLine,
  useUpdateWorkUnitLayout,
  useWorkCenter,
  useWorkUnitsByWorkCenter,
} from "@/lib/queries.js";
import {
  flowLabel,
  groupEquipmentByUnit,
  NODE_DEFAULT_SIZE,
  toFlowEdges,
  toFlowNodes,
  wouldCreateCycle,
} from "@/lib/dag-editor.js";
import { extractError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { FullPageLoader } from "@/components/full-page-loader.js";
import { DagCanvas } from "@/components/dag-editor/dag-canvas.js";
import { DagEditorContext } from "@/components/dag-editor/dag-editor-context.js";
import { DagToolbar } from "@/components/dag-editor/dag-toolbar.js";
import { DetailPanel } from "@/components/dag-editor/detail-panel.js";
import { DeleteFlowDialog } from "@/components/line-detail/delete-flow-dialog.js";
import { MachineFormDialog } from "@/components/level-configuration/machine-form-dialog.js";

import type { MachineTarget } from "@/components/level-configuration/machine-form-dialog.js";
import type { PanelSelection } from "@/components/dag-editor/detail-panel.js";
import type { DeleteFlowTarget } from "@/components/line-detail/delete-flow-dialog.js";
import type {
  EdgeListItem,
  EquipmentListItem,
  NodeLayout,
  WorkCenterDetail,
  WorkUnitListItem,
} from "@/lib/types.js";

const EMPTY_UNITS: WorkUnitListItem[] = [];
const EMPTY_FLOWS: EdgeListItem[] = [];
const EMPTY_EQUIPMENT: EquipmentListItem[] = [];

type DagEditorContentProps = {
  workCenter: WorkCenterDetail;
};

// The editor proper. Split from the route so it can sit inside
// `ReactFlowProvider` and ask the canvas where the viewport currently is.
function DagEditorContent({ workCenter }: DagEditorContentProps) {
  const workCenterId = workCenter.id;
  const canvasRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const { data: workUnits } = useWorkUnitsByWorkCenter(workCenterId);
  const { data: flows } = useEdges(workCenterId);
  const { data: equipment } = useEquipmentsByLine(workCenterId);

  const units = workUnits ?? EMPTY_UNITS;
  const edges = flows ?? EMPTY_FLOWS;
  const equipments = equipment ?? EMPTY_EQUIPMENT;

  const unitIds = useMemo(() => units.map((unit) => unit.id), [units]);
  const { data: countPointTotals } = useCountPointTotals(unitIds);

  const equipmentByUnit = useMemo(() => groupEquipmentByUnit(equipments), [equipments]);
  const nodes = useMemo(
    () => toFlowNodes(units, equipmentByUnit, countPointTotals),
    [units, equipmentByUnit, countPointTotals],
  );
  const flowEdges = useMemo(() => toFlowEdges(edges), [edges]);

  const [selection, setSelection] = useState<PanelSelection | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [machineTarget, setMachineTarget] = useState<MachineTarget | null>(null);
  const [deleteFlowTarget, setDeleteFlowTarget] = useState<DeleteFlowTarget | null>(null);

  const createEdge = useCreateEdge();
  const saveLayoutMutation = useUpdateWorkUnitLayout(workCenterId);

  // Deleting the equipment in view leaves the panel pointing at nothing, so the
  // selection walks back up to its machine on its own.
  useEffect(() => {
    if (selection?.kind !== "equipment" || equipment === undefined) return;
    if (equipment.some((item) => item.id === selection.equipmentId)) return;

    setSelection({ kind: "machine", workUnitId: selection.workUnitId });
  }, [selection, equipment]);

  function saveLayout(workUnitId: number, layout: NodeLayout) {
    saveLayoutMutation.mutate(
      { id: workUnitId, position: layout },
      {
        onError: (err) =>
          setErrorMessage(extractError(err, "Failed to save the layout. Please try again.")),
      },
    );
  }

  function connectMachines(fromWorkUnitId: number, toWorkUnitId: number) {
    setErrorMessage(null);

    // Refused here so an obvious loop never leaves the browser; the API checks
    // the whole graph regardless and has the final say.
    if (wouldCreateCycle(edges, fromWorkUnitId, toWorkUnitId)) {
      setErrorMessage("That connection would create a loop. A line has to flow one way.");
      return;
    }

    createEdge.mutate(
      { workCenterId, body: { fromWorkUnitId, toWorkUnitId } },
      {
        onError: (err) =>
          setErrorMessage(extractError(err, "Failed to connect these machines. Please try again.")),
      },
    );
  }

  function selectFlow(edgeId: number) {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) return;

    setDeleteFlowTarget({ workCenterId, id: edge.id, label: flowLabel(edge) });
  }

  // A new machine lands in the middle of what the user is looking at rather than
  // on top of whatever sits at the canvas origin.
  function addMachine() {
    const bounds = canvasRef.current?.getBoundingClientRect();
    const centre = bounds
      ? screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        })
      : { x: 0, y: 0 };

    setMachineTarget({
      line: { id: workCenterId, name: workCenter.name },
      item: null,
      position: {
        x: centre.x - NODE_DEFAULT_SIZE.width / 2,
        y: centre.y - NODE_DEFAULT_SIZE.height / 2,
      },
    });
  }

  const selectedMachineName = units.find((unit) => unit.id === selection?.workUnitId)?.name ?? "";

  return (
    <DagEditorContext
      value={{
        connectMode,
        selectMachine: (workUnitId) => setSelection({ kind: "machine", workUnitId }),
        selectEquipment: (workUnitId, equipmentId) =>
          setSelection({ kind: "equipment", workUnitId, equipmentId }),
        saveLayout,
      }}
    >
      <DagToolbar
        workCenter={workCenter}
        connectMode={connectMode}
        onToggleConnectMode={() => setConnectMode((on) => !on)}
        onAddMachine={addMachine}
      />

      {errorMessage && (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-destructive/10 px-4 py-2">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label="Dismiss message"
            onClick={() => setErrorMessage(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div ref={canvasRef} className="min-w-0 flex-1">
          <DagCanvas
            nodes={nodes}
            edges={flowEdges}
            connectMode={connectMode}
            onNodeMoved={saveLayout}
            onConnectMachines={connectMachines}
            onEdgeSelect={selectFlow}
          />
        </div>

        {selection && (
          <DetailPanel
            selection={selection}
            workCenterId={workCenterId}
            machineName={selectedMachineName}
            equipment={equipments}
            onClose={() => setSelection(null)}
            onSelectMachine={(workUnitId) => setSelection({ kind: "machine", workUnitId })}
            onSelectEquipment={(workUnitId, equipmentId) =>
              setSelection({ kind: "equipment", workUnitId, equipmentId })
            }
          />
        )}
      </div>

      <MachineFormDialog
        open={machineTarget != null}
        onOpenChange={(open) => !open && setMachineTarget(null)}
        target={machineTarget}
      />
      <DeleteFlowDialog
        target={deleteFlowTarget}
        onOpenChange={(open) => !open && setDeleteFlowTarget(null)}
      />
    </DagEditorContext>
  );
}

// The line's machines and flows as a graph. Guards mirror the line detail page,
// except a missing line sends you back to the line rather than the tree.
function DagEditor() {
  const { id } = useParams({ strict: false });
  const workCenterId = Number(id);

  const { data: workCenter, isPending, isError } = useWorkCenter(workCenterId);

  if (!Number.isFinite(workCenterId) || isError || (!isPending && !workCenter)) {
    return (
      <div className="flex flex-col items-start gap-3 p-4 md:p-6">
        <p className="text-sm text-destructive">Line not found.</p>
        <Button asChild variant="outline">
          <Link to="/level-configuration">Back to Level Configuration</Link>
        </Button>
      </div>
    );
  }

  if (isPending || !workCenter) return <FullPageLoader />;

  return (
    <ReactFlowProvider>
      <DagEditorContent workCenter={workCenter} />
    </ReactFlowProvider>
  );
}

export { DagEditor };
