import { useState } from "react";
import { isAxiosError } from "axios";

import { useDeleteDowntimeAction } from "@/lib/queries.js";
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

type DeleteTarget = { id: number; name: string };

function extractError(err: unknown): string {
  const apiError = isAxiosError(err)
    ? (err.response?.data as { error?: string } | undefined)?.error
    : undefined;
  return apiError ?? "Failed to delete downtime action. Please try again.";
}

type DeleteDowntimeActionDialogProps = {
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
};

function DeleteDowntimeActionDialog({ target, onOpenChange }: DeleteDowntimeActionDialogProps) {
  const deleteDowntimeAction = useDeleteDowntimeAction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) setErrorMessage(null);
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!target) return;
    setErrorMessage(null);
    deleteDowntimeAction.mutate(target.id, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => setErrorMessage(extractError(err)),
    });
  }

  return (
    <AlertDialog open={target != null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Downtime Action?</AlertDialogTitle>
          {/* Names the consequence the OEE monitor sees, because it is not
              obvious from here: downtime records store the action NAME, not a
              foreign key, so deleting one removes it from the picker without
              rewriting any stop that already cites it. */}
          <AlertDialogDescription>
            This permanently deletes &ldquo;{target?.name}&rdquo; from the picker. Stops that
            already cite it keep their label. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDowntimeAction.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteDowntimeAction.isPending}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the request resolves
              handleConfirm();
            }}
          >
            {deleteDowntimeAction.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteDowntimeActionDialog };
export type { DeleteTarget };
