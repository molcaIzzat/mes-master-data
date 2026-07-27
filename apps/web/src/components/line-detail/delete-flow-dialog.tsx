import { useState } from "react";
import { isAxiosError } from "axios";

import { useDeleteEdge } from "@/lib/queries.js";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog.js";

type DeleteFlowTarget = {
  workCenterId: number;
  id: number;
  // "Filler - FI2-L1-FILL → Capper - FI2-L1-CAP", quoted back in the prompt.
  label: string;
};

function extractError(err: unknown): string {
  const fallback = "Failed to delete this flow. Please try again.";
  if (!isAxiosError(err)) return fallback;
  return (err.response?.data as { error?: string } | undefined)?.error ?? fallback;
}

type DeleteFlowDialogProps = {
  target: DeleteFlowTarget | null;
  onOpenChange: (open: boolean) => void;
};

// Flows own nothing, so this is a plain confirmation -- no cascade to warn about.
function DeleteFlowDialog({ target, onOpenChange }: DeleteFlowDialogProps) {
  const deleteFlow = useDeleteEdge();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) setErrorMessage(null);
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!target) return;
    setErrorMessage(null);
    deleteFlow.mutate(
      { workCenterId: target.workCenterId, id: target.id },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setErrorMessage(extractError(err)),
      },
    );
  }

  return (
    <ConfirmDeleteDialog
      open={target != null}
      onOpenChange={handleOpenChange}
      title="Delete flow?"
      description={
        <>
          This removes the connection &ldquo;{target?.label}&rdquo;. The machines themselves are
          left alone.
        </>
      }
      isPending={deleteFlow.isPending}
      errorMessage={errorMessage}
      onConfirm={handleConfirm}
    />
  );
}

export { DeleteFlowDialog };
export type { DeleteFlowTarget };
