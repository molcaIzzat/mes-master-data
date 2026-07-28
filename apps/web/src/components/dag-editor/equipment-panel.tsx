import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { SummaryField } from "@/components/summary-field.js";
import { EquipmentFormDialog } from "@/components/level-configuration/equipment-form-dialog.js";
import { DeleteMachineChildDialog } from "@/components/machine-detail/delete-machine-child-dialog.js";

import type { EquipmentTarget } from "@/components/level-configuration/equipment-form-dialog.js";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { EquipmentListItem } from "@/lib/types.js";

type EquipmentPanelProps = {
  // Undefined for the moment between a delete landing and the editor stepping
  // the selection back up to the machine.
  equipment: EquipmentListItem | undefined;
  workUnitId: number;
  workUnitName: string;
};

// One piece of equipment, drilled into from a machine node or the machine panel.
// Everything shown here already came down with the line's equipment list, so
// there is no second request.
function EquipmentPanel({ equipment, workUnitId, workUnitName }: EquipmentPanelProps) {
  const [formTarget, setFormTarget] = useState<EquipmentTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteMachineChildTarget | null>(null);

  if (!equipment) {
    return <p className="p-4 text-sm text-muted-foreground">This equipment is no longer here.</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <SummaryField label="Equipment Code" value={equipment.code} />
        <SummaryField label="Equipment Name" value={equipment.name} />
      </div>
      <SummaryField label="Equipment Class" value={equipment.class?.name ?? "—"} />

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Product Signal Tag</span>
        <span className="font-mono text-xs break-all">{equipment.productSignalTag || "—"}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Button
          className="w-full"
          onClick={() =>
            setFormTarget({ unit: { id: workUnitId, name: workUnitName }, item: equipment })
          }
        >
          <Pencil />
          Edit Equipment
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() =>
            setDeleteTarget({
              kind: "equipment",
              workUnitId,
              id: equipment.id,
              name: equipment.name,
            })
          }
        >
          <Trash2 />
          Delete Equipment
        </Button>
      </div>

      <EquipmentFormDialog
        open={formTarget != null}
        onOpenChange={(open) => !open && setFormTarget(null)}
        target={formTarget}
      />
      {/* Nothing to do on success here: once the equipment is gone from the
          line's list, the editor moves the selection back to the machine. */}
      <DeleteMachineChildDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export { EquipmentPanel };
