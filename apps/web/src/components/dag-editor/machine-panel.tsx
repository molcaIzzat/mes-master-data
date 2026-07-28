import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useDeleteWorkUnit, useWorkUnit } from "@/lib/queries.js";
import { extractError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Separator } from "@/components/ui/separator.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog.js";
import { SummaryField } from "@/components/summary-field.js";
import { EquipmentCard } from "@/components/dag-editor/equipment-card.js";
import { EquipmentFormDialog } from "@/components/level-configuration/equipment-form-dialog.js";
import { MachineFormDialog } from "@/components/level-configuration/machine-form-dialog.js";
import { CountPointSection } from "@/components/machine-detail/count-point-section.js";
import { DeleteMachineChildDialog } from "@/components/machine-detail/delete-machine-child-dialog.js";
import { ProductCodeSection } from "@/components/machine-detail/product-code-section.js";
import { SpecificationSection } from "@/components/machine-detail/specification-section.js";

import type { EquipmentTarget } from "@/components/level-configuration/equipment-form-dialog.js";
import type { MachineTarget } from "@/components/level-configuration/machine-form-dialog.js";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { EquipmentListItem } from "@/lib/types.js";

type MachinePanelProps = {
  workUnitId: number;
  workCenterId: number;
  // Already narrowed to this machine by the canvas, so the panel needs no query
  // of its own for the Equipment tab.
  equipment: EquipmentListItem[];
  onSelectEquipment: (equipmentId: number) => void;
  onDeleted: () => void;
};

// Everything a machine owns, in the panel beside the canvas. The three table tabs
// are the very sections the machine detail page renders, so a change made here
// behaves identically there.
function MachinePanel({
  workUnitId,
  workCenterId,
  equipment,
  onSelectEquipment,
  onDeleted,
}: MachinePanelProps) {
  const { data: workUnit, isPending, isError } = useWorkUnit(workUnitId);

  const [machineTarget, setMachineTarget] = useState<MachineTarget | null>(null);
  const [equipmentTarget, setEquipmentTarget] = useState<EquipmentTarget | null>(null);
  const [childTarget, setChildTarget] = useState<DeleteMachineChildTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMachine = useDeleteWorkUnit();

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (isError || !workUnit) {
    return <p className="p-4 text-sm text-destructive">Failed to load this machine.</p>;
  }

  function openEditMachine() {
    if (!workUnit) return;
    setMachineTarget({
      line: { id: workCenterId, name: workUnit.workCenter?.name ?? "" },
      // The dialog reads only name/code/class off the item.
      item: { ...workUnit, equipments: [] },
    });
  }

  function handleDeleteMachine() {
    setDeleteError(null);
    deleteMachine.mutate(workUnitId, {
      onSuccess: () => {
        setConfirmDelete(false);
        onDeleted();
      },
      onError: (err) =>
        setDeleteError(
          extractError(err, "Failed to delete this machine. Remove its equipment and flows first."),
        ),
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <SummaryField label="Machine Code" value={workUnit.code} />
        <SummaryField label="Machine Name" value={workUnit.name} />
      </div>
      <SummaryField label="Machine Class" value={workUnit.class?.name ?? "—"} />

      <div className="flex flex-col gap-1">
        <Button className="w-full" onClick={openEditMachine}>
          <Pencil />
          Edit Machine
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
        >
          <Trash2 />
          Delete Machine
        </Button>
      </div>

      <Separator />

      <Tabs defaultValue="equipment" className="gap-4">
        <TabsList className="w-full">
          <TabsTrigger value="equipment" className="px-1 text-xs">
            Equipment
          </TabsTrigger>
          <TabsTrigger value="specification" className="px-1 text-xs">
            Specification
          </TabsTrigger>
          <TabsTrigger value="alias" className="px-1 text-xs">
            Alias
          </TabsTrigger>
          <TabsTrigger value="count-point" className="px-1 text-xs">
            Count Point
          </TabsTrigger>
        </TabsList>

        {/* Equipment reads as cards here, not a table: the same cards the node
            shows, and the way into the equipment view. */}
        <TabsContent value="equipment" className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              setEquipmentTarget({ unit: { id: workUnitId, name: workUnit.name }, item: null })
            }
          >
            <Plus />
            Add Equipment
          </Button>

          {equipment.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              No equipment yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {equipment.map((item) => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  onSelect={() => onSelectEquipment(item.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="specification">
          <SpecificationSection
            workUnitId={workUnitId}
            workCenterId={workCenterId}
            onDelete={setChildTarget}
          />
        </TabsContent>

        <TabsContent value="alias">
          <ProductCodeSection
            workUnitId={workUnitId}
            workCenterId={workCenterId}
            onDelete={setChildTarget}
          />
        </TabsContent>

        <TabsContent value="count-point">
          <CountPointSection workUnitId={workUnitId} onDelete={setChildTarget} />
        </TabsContent>
      </Tabs>

      <MachineFormDialog
        open={machineTarget != null}
        onOpenChange={(open) => !open && setMachineTarget(null)}
        target={machineTarget}
      />
      <EquipmentFormDialog
        open={equipmentTarget != null}
        onOpenChange={(open) => !open && setEquipmentTarget(null)}
        target={equipmentTarget}
      />
      <DeleteMachineChildDialog
        target={childTarget}
        onOpenChange={(open) => !open && setChildTarget(null)}
      />
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open);
          if (!open) setDeleteError(null);
        }}
        title="Delete machine?"
        description={
          <>
            This permanently deletes &ldquo;{workUnit.name}&rdquo; and every flow it takes part in.
            This action cannot be undone.
          </>
        }
        isPending={deleteMachine.isPending}
        errorMessage={deleteError}
        onConfirm={handleDeleteMachine}
      />
    </div>
  );
}

export { MachinePanel };
