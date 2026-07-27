import { useState } from "react";
import { isAxiosError } from "axios";

import {
  useDeleteCountPoint,
  useDeleteEquipment,
  useDeleteProductAlias,
  useDeleteProductSpec,
} from "@/lib/queries.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.js";
import { buttonVariants } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";

// The four things a machine owns, all deleted the same way.
type MachineChildKind = "equipment" | "specification" | "product code" | "count point";

type DeleteMachineChildTarget = {
  kind: MachineChildKind;
  workUnitId: number;
  id: number;
  // What the confirmation quotes back, e.g. the equipment name or the SKU.
  name: string;
};

// Equipment is the only one of the four with dependents of its own.
const CASCADE: Partial<Record<MachineChildKind, string>> = {
  equipment: "its count points and product code aliases",
};

// A referential failure comes back as a 409 whose message is the raw failing
// SQL, which is useless to a user; replace it with an explanation.
function extractError(err: unknown, kind: MachineChildKind): string {
  const fallback = `Failed to delete this ${kind}. Please try again.`;
  if (!isAxiosError(err)) return fallback;

  if (err.response?.status === 409) {
    return `This ${kind} is still referenced by other records, so it cannot be deleted. Remove those references first.`;
  }

  const apiError = (err.response?.data as { error?: string } | undefined)?.error;
  return apiError ?? fallback;
}

type DeleteMachineChildDialogProps = {
  target: DeleteMachineChildTarget | null;
  onOpenChange: (open: boolean) => void;
};

function DeleteMachineChildDialog({ target, onOpenChange }: DeleteMachineChildDialogProps) {
  const deleteEquipment = useDeleteEquipment();
  const deleteSpec = useDeleteProductSpec();
  const deleteAlias = useDeleteProductAlias();
  const deletePoint = useDeleteCountPoint();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const kind = target?.kind ?? "equipment";
  const isPending =
    deleteEquipment.isPending ||
    deleteSpec.isPending ||
    deleteAlias.isPending ||
    deletePoint.isPending;

  function handleOpenChange(open: boolean) {
    if (!open) setErrorMessage(null);
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!target) return;
    setErrorMessage(null);

    const options = {
      onSuccess: () => onOpenChange(false),
      onError: (err: unknown) => setErrorMessage(extractError(err, target.kind)),
    };
    const ref = { workUnitId: target.workUnitId, id: target.id };

    // Equipment lives on its own resource; the other three hang off the work
    // unit and take the pair.
    if (target.kind === "equipment") deleteEquipment.mutate(target.id, options);
    else if (target.kind === "specification") deleteSpec.mutate(ref, options);
    else if (target.kind === "product code") deleteAlias.mutate(ref, options);
    else deletePoint.mutate(ref, options);
  }

  return (
    <AlertDialog open={target != null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {kind}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes &ldquo;{target?.name}&rdquo;
            {CASCADE[kind] ? <> along with {CASCADE[kind]}</> : null}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the request resolves
              handleConfirm();
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteMachineChildDialog };
export type { DeleteMachineChildTarget, MachineChildKind };
