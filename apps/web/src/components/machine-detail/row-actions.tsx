import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button.js";

type RowActionsProps = {
  // Names the row for screen readers, e.g. "count point MITSUM-1".
  label: string;
  onEdit: () => void;
  onDelete: () => void;
};

// Edit / Delete pair in the Action column of every machine detail section.
function RowActions({ label, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Edit ${label}`}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-destructive hover:text-destructive"
        aria-label={`Delete ${label}`}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export { RowActions };
