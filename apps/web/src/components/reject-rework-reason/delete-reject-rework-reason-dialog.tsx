import { useState } from "react";
import { isAxiosError } from "axios";

import { useDeleteRejectReworkReason } from "@/lib/queries.js";
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
  return apiError ?? "Failed to delete reject & rework reason. Please try again.";
}

type DeleteRejectReworkReasonDialogProps = {
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
};

function DeleteRejectReworkReasonDialog({
  target,
  onOpenChange,
}: DeleteRejectReworkReasonDialogProps) {
  const deleteRejectReworkReason = useDeleteRejectReworkReason();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) setErrorMessage(null);
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!target) return;
    setErrorMessage(null);
    deleteRejectReworkReason.mutate(target.id, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => setErrorMessage(extractError(err)),
    });
  }

  return (
    <AlertDialog open={target != null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Reject & Rework Reason?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes &ldquo;{target?.name}&rdquo;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRejectReworkReason.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteRejectReworkReason.isPending}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the request resolves
              handleConfirm();
            }}
          >
            {deleteRejectReworkReason.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteRejectReworkReasonDialog };
export type { DeleteTarget };
