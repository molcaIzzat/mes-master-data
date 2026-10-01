import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import { useCreateEquipment, useEquipmentClasses, useUpdateEquipment } from "@/lib/queries.js";
import {
  defaultEquipmentValues,
  equipmentSchema,
  toEquipmentFormValues,
  toEquipmentRequestBody,
} from "@/lib/level-configuration-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { ClassSelect } from "@/components/level-configuration/class-select.js";

import type { LevelEquipmentItem } from "@/lib/types.js";

// The parent machine comes from the row the action was triggered from.
type EquipmentTarget = {
  unit: { id: number; name: string };
  item: LevelEquipmentItem | null;
};

type EquipmentFormProps = EquipmentTarget & {
  onClose: () => void;
};

function EquipmentForm({ unit, item, onClose }: EquipmentFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();

  const { data: classes } = useEquipmentClasses();

  const form = useForm({
    defaultValues: item ? toEquipmentFormValues(item) : defaultEquipmentValues(),
    validators: { onChange: equipmentSchema, onSubmit: equipmentSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toEquipmentRequestBody(value, unit.id);
      try {
        if (item) {
          await updateEquipment.mutateAsync({ id: item.id, body });
        } else {
          await createEquipment.mutateAsync(body);
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the equipment. Please try again."));
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

      <FieldShell label="Machine">
        <Input value={unit.name} readOnly disabled />
      </FieldShell>

      <form.Field name="name">
        {(field) => (
          <FieldShell label="Equipment Name" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input equipment name..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="code">
        {(field) => (
          <FieldShell label="Equipment Code" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input equipment code..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="equipmentClassId">
        {(field) => (
          <FieldShell label="Equipment Class" error={firstError(field.state.meta.errors)}>
            <ClassSelect
              options={classes}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select equipment class..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="productSignalTag">
        {(field) => (
          <FieldShell
            label="Product Signal Tag"
            required
            error={firstError(field.state.meta.errors)}
            hint="PLC address this equipment reports its product code on."
          >
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. PLC/FI2-L1/MITSUM-1/Product_Code"
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

type EquipmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EquipmentTarget | null;
};

function EquipmentFormDialog({ open, onOpenChange, target }: EquipmentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Equipment" : "Add Equipment"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <EquipmentForm
            key={target.item?.id ?? `add-${target.unit.id}`}
            unit={target.unit}
            item={target.item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { EquipmentFormDialog };
export type { EquipmentTarget };
