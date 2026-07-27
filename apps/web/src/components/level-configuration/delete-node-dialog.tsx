import { useState } from "react";
import { isAxiosError } from "axios";

import { useDeleteEquipment, useDeleteWorkCenter, useDeleteWorkUnit } from "@/lib/queries.js";
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

import type { LevelRowKind } from "@/components/level-configuration/level-tree-table.js";

// `childCount` lets the dialog refuse up front: the FKs are ON DELETE RESTRICT,
// so a line with machines (or a machine with equipment) can never be deleted.
type DeleteNodeTarget = {
  kind: LevelRowKind;
  id: number;
  name: string;
  childCount: number;
};

// `cascade` spells out what the database takes with it. Those FKs are ON DELETE
// CASCADE, so the rows go without any further confirmation -- the user has to be
// told here or not at all.
const LABEL: Record<LevelRowKind, { entity: string; child: string; cascade: string | null }> = {
  line: {
    entity: "Line",
    child: "machine",
    cascade: "its product assignments",
  },
  unit: {
    entity: "Machine",
    child: "equipment",
    cascade: "its count points, product specs, product code aliases and flow connections",
  },
  equipment: {
    entity: "Equipment",
    child: "",
    cascade: "its count points and product code aliases",
  },
};

function plural(count: number, noun: string): string {
  if (noun === "equipment") return `${count} equipment`;
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// The API surfaces a referential failure as a 409 whose message is the raw
// failing SQL, which is useless to a user; replace it with an explanation. Other
// statuses keep whatever message the envelope carried.
function extractError(err: unknown, entity: string): string {
  if (!isAxiosError(err)) return `Failed to delete this ${entity.toLowerCase()}. Please try again.`;

  if (err.response?.status === 409) {
    return `This ${entity.toLowerCase()} is still referenced by other records, so it cannot be deleted. Remove those references first.`;
  }

  const apiError = (err.response?.data as { error?: string } | undefined)?.error;
  return apiError ?? `Failed to delete this ${entity.toLowerCase()}. Please try again.`;
}

type DeleteNodeDialogProps = {
  target: DeleteNodeTarget | null;
  onOpenChange: (open: boolean) => void;
};

function DeleteNodeDialog({ target, onOpenChange }: DeleteNodeDialogProps) {
  const deleteLine = useDeleteWorkCenter();
  const deleteMachine = useDeleteWorkUnit();
  const deleteEquipment = useDeleteEquipment();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation =
    target?.kind === "line"
      ? deleteLine
      : target?.kind === "unit"
        ? deleteMachine
        : deleteEquipment;

  const labels = LABEL[target?.kind ?? "equipment"];
  const blocked = (target?.childCount ?? 0) > 0;

  function handleOpenChange(open: boolean) {
    if (!open) setErrorMessage(null);
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!target) return;
    setErrorMessage(null);
    mutation.mutate(target.id, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => setErrorMessage(extractError(err, labels.entity)),
    });
  }

  return (
    <AlertDialog open={target != null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked ? `Cannot Delete ${labels.entity}` : `Delete ${labels.entity}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked ? (
              <>
                &ldquo;{target?.name}&rdquo; still has{" "}
                {plural(target?.childCount ?? 0, labels.child)}. Delete{" "}
                {(target?.childCount ?? 0) === 1 ? "it" : "them"} first, then delete this{" "}
                {labels.entity.toLowerCase()}.
              </>
            ) : (
              <>
                This permanently deletes &ldquo;{target?.name}&rdquo;
                {labels.cascade ? <> along with {labels.cascade}</> : null}. This action cannot be
                undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {blocked ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open until the request resolves
                handleConfirm();
              }}
            >
              {mutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteNodeDialog };
export type { DeleteNodeTarget };
