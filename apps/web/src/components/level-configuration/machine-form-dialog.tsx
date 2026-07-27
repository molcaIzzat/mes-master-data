import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import { useCreateWorkUnit, useUpdateWorkUnit, useWorkUnitClasses } from "@/lib/queries.js";
import {
  defaultMachineValues,
  machineSchema,
  toMachineFormValues,
  toMachineRequestBody,
} from "@/lib/level-configuration-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { ClassSelect } from "@/components/level-configuration/class-select.js";

import type { LevelWorkUnitItem } from "@/lib/types.js";

// The parent line is fixed by the row the action was triggered from, so it is
// shown read-only rather than as a picker.
type MachineTarget = {
  line: { id: number; name: string };
  item: LevelWorkUnitItem | null;
};

type MachineFormProps = MachineTarget & {
  onClose: () => void;
};

function MachineForm({ line, item, onClose }: MachineFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createMachine = useCreateWorkUnit();
  const updateMachine = useUpdateWorkUnit();

  const { data: classes } = useWorkUnitClasses();

  const form = useForm({
    defaultValues: item ? toMachineFormValues(item) : defaultMachineValues(),
    validators: { onChange: machineSchema, onSubmit: machineSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toMachineRequestBody(value, line.id);
      try {
        if (item) {
          await updateMachine.mutateAsync({ id: item.id, body });
        } else {
          await createMachine.mutateAsync(body);
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the machine. Please try again."));
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <FieldShell label="Line">
        <Input value={line.name} readOnly disabled />
      </FieldShell>

      <form.Field name="name">
        {(field) => (
          <FieldShell label="Machine Name" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input machine name..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="code">
        {(field) => (
          <FieldShell label="Machine Code" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input machine code..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="workUnitClassId">
        {(field) => (
          <FieldShell label="Machine Class" error={firstError(field.state.meta.errors)}>
            <ClassSelect
              options={classes}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select machine class..."
            />
          </FieldShell>
        )}
      </form.Field>

      <div className="flex flex-col gap-2 pt-2">
        <form.Subscribe
          selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              <Save />
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="ghost" onClick={onClose}>
          Discard
        </Button>
      </div>
    </form>
  );
}

type MachineFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Null while no machine action is pending; otherwise the parent line plus the
  // machine being edited (or null when adding).
  target: MachineTarget | null;
};

function MachineFormDialog({ open, onOpenChange, target }: MachineFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Machine" : "Add Machine"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <MachineForm
            key={target.item?.id ?? `add-${target.line.id}`}
            line={target.line}
            item={target.item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { MachineFormDialog };
export type { MachineTarget };
