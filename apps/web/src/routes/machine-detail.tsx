import { useCallback, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";

import { useWorkCenter, useWorkUnit } from "@/lib/queries.js";
import { Button } from "@/components/ui/button.js";
import { FullPageLoader } from "@/components/full-page-loader.js";
import { MachineFormDialog } from "@/components/level-configuration/machine-form-dialog.js";
import { CountPointSection } from "@/components/machine-detail/count-point-section.js";
import { DeleteMachineChildDialog } from "@/components/machine-detail/delete-machine-child-dialog.js";
import { EquipmentSection } from "@/components/machine-detail/equipment-section.js";
import { MachineSummary } from "@/components/machine-detail/machine-summary.js";
import { ProductCodeSection } from "@/components/machine-detail/product-code-section.js";
import { SpecificationSection } from "@/components/machine-detail/specification-section.js";

import type { MachineTarget } from "@/components/level-configuration/machine-form-dialog.js";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";

function MachineDetail() {
  const { id } = useParams({ strict: false });
  const workUnitId = Number(id);

  const [machineOpen, setMachineOpen] = useState(false);
  const [machineTarget, setMachineTarget] = useState<MachineTarget | null>(null);
  // One confirmation serves all four sections.
  const [deleteTarget, setDeleteTarget] = useState<DeleteMachineChildTarget | null>(null);

  const { data: workUnit, isPending, isError } = useWorkUnit(workUnitId);
  // The line supplies the area and category the work unit does not carry.
  const { data: workCenter } = useWorkCenter(workUnit?.workCenter?.id);

  const handleDelete = useCallback((target: DeleteMachineChildTarget) => {
    setDeleteTarget(target);
  }, []);

  if (!Number.isFinite(workUnitId) || isError || (!isPending && !workUnit)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">Machine not found.</p>
        <Button asChild variant="outline">
          <Link to="/level-configuration">Back to Level Configuration</Link>
        </Button>
      </div>
    );
  }

  if (isPending || !workUnit) return <FullPageLoader />;

  const line = workUnit.workCenter;

  function openEditMachine() {
    if (!workUnit || !line) return;
    setMachineTarget({
      line: { id: line.id, name: line.name },
      // The dialog only reads name/code/class off the item; the tree's
      // `equipments` are irrelevant here.
      item: { ...workUnit, equipments: [] },
    });
    setMachineOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <MachineSummary
        workUnit={workUnit}
        workCenter={workCenter ?? undefined}
        onEdit={openEditMachine}
      />

      <EquipmentSection
        workUnitId={workUnitId}
        workUnitName={workUnit.name}
        onDelete={handleDelete}
      />

      {/* Both of these scope their Product select to the machine's line, so they
          wait for it to resolve. */}
      {line && (
        <>
          <SpecificationSection
            workUnitId={workUnitId}
            workCenterId={line.id}
            onDelete={handleDelete}
          />
          <ProductCodeSection
            workUnitId={workUnitId}
            workCenterId={line.id}
            onDelete={handleDelete}
          />
        </>
      )}

      <CountPointSection workUnitId={workUnitId} onDelete={handleDelete} />

      <MachineFormDialog open={machineOpen} onOpenChange={setMachineOpen} target={machineTarget} />
      <DeleteMachineChildDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export { MachineDetail };
