import { useState } from "react";
import { isAxiosError } from "axios";

import { useDeleteDowntimeReason } from "@/lib/queries.js";
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
  return apiError ?? "Failed to delete downtime reason. Please try again.";
}

type DeleteDowntimeReasonDialogProps = {
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
};

function DeleteDowntimeReasonDialog({ target, onOpenChange }: DeleteDowntimeReasonDialogProps) {
  const deleteDowntimeReason = useDeleteDowntimeReason();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) setErrorMessage(null);
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!target) return;
    setErrorMessage(null);
    deleteDowntimeReason.mutate(target.id, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => setErrorMessage(extractError(err)),
    });
  }

  return (
    <AlertDialog open={target != null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Downtime Reason?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes &ldquo;{target?.name}&rdquo;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDowntimeReason.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteDowntimeReason.isPending}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the request resolves
              handleConfirm();
            }}
          >
            {deleteDowntimeReason.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteDowntimeReasonDialog };
export type { DeleteTarget };
