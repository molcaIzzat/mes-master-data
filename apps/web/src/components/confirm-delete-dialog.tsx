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

import type { ReactNode } from "react";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  // Set while the request is in flight; both buttons lock and the action reads
  // "Deleting...".
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
};

// The destructive-confirmation shell every delete in the app shares. The caller
// owns the mutation and the copy; this only renders and stays open until the
// request resolves.
function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  errorMessage,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the request resolves
              onConfirm();
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDeleteDialog };
