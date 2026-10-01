import { ArrowLeft, X } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { EquipmentPanel } from "@/components/dag-editor/equipment-panel.js";
import { MachinePanel } from "@/components/dag-editor/machine-panel.js";

import type { EquipmentListItem } from "@/lib/types.js";

// Which of the two views the panel is showing. Equipment always remembers the
// machine it came from, so `Back` has somewhere to go.
type PanelSelection =
  | { kind: "machine"; workUnitId: number }
  | { kind: "equipment"; workUnitId: number; equipmentId: number };

type DetailPanelProps = {
  selection: PanelSelection;
  workCenterId: number;
  // Named by the canvas, which already holds the line's machines.
  machineName: string;
  // The whole line's equipment; the panel narrows it to the machine in view.
  equipment: EquipmentListItem[];
  onClose: () => void;
  onSelectMachine: (workUnitId: number) => void;
  onSelectEquipment: (workUnitId: number, equipmentId: number) => void;
};

// A column beside the canvas rather than an overlay: editing a machine while the
// node it belongs to is hidden behind a scrim would be the wrong way round.
function DetailPanel({
  selection,
  workCenterId,
  machineName,
  equipment,
  onClose,
  onSelectMachine,
  onSelectEquipment,
}: DetailPanelProps) {
  const machineEquipment = equipment.filter((item) => item.unit?.id === selection.workUnitId);

  return (
    <aside className="flex w-full shrink-0 flex-col border-l bg-background sm:w-sm lg:w-md">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
        {selection.kind === "equipment" ? (
          <Button variant="ghost" size="sm" onClick={() => onSelectMachine(selection.workUnitId)}>
            <ArrowLeft />
            Back
          </Button>
        ) : (
          <span className="px-2 text-sm font-medium">Machine</span>
        )}

        <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selection.kind === "machine" ? (
          <MachinePanel
            key={selection.workUnitId}
            workUnitId={selection.workUnitId}
            workCenterId={workCenterId}
            equipment={machineEquipment}
            onSelectEquipment={(equipmentId) =>
              onSelectEquipment(selection.workUnitId, equipmentId)
            }
            onDeleted={onClose}
          />
        ) : (
          <EquipmentPanel
            key={selection.equipmentId}
            equipment={machineEquipment.find((item) => item.id === selection.equipmentId)}
            workUnitId={selection.workUnitId}
            workUnitName={machineName}
          />
        )}
      </div>
    </aside>
  );
}

export { DetailPanel };
export type { PanelSelection };
