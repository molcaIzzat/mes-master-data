import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import {
  useCreateCountPoint,
  useEquipmentsByWorkUnit,
  useUoms,
  useUpdateCountPoint,
} from "@/lib/queries.js";
import {
  COUNT_ROLE_LABELS,
  COUNT_SOURCE_LABELS,
  countPointSchema,
  defaultCountPointValues,
  toCountPointFormValues,
  toCountPointRequestBody,
} from "@/lib/machine-detail-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { COUNT_ROLES, COUNT_SOURCES } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { EnumSelect } from "@/components/form/enum-select.js";
import { IdSelect } from "@/components/form/id-select.js";

import type { IdOption } from "@/components/form/id-select.js";
import type { CountPointListItem } from "@/lib/types.js";

type CountPointTarget = {
  workUnitId: number;
  item: CountPointListItem | null;
};

type CountPointFormProps = CountPointTarget & {
  onClose: () => void;
};

function CountPointForm({ workUnitId, item, onClose }: CountPointFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createPoint = useCreateCountPoint();
  const updatePoint = useUpdateCountPoint();

  const form = useForm({
    defaultValues: item ? toCountPointFormValues(item) : defaultCountPointValues(),
    validators: { onChange: countPointSchema, onSubmit: countPointSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toCountPointRequestBody(value);
      try {
        if (item) {
          await updatePoint.mutateAsync({ workUnitId, id: item.id, body });
        } else {
          await createPoint.mutateAsync({ workUnitId, body });
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the count point. Please try again."));
      }
    },
  });

  const { data: equipments } = useEquipmentsByWorkUnit(workUnitId);
  const equipmentOptions = useMemo<IdOption[]>(
    () => (equipments ?? []).map((e) => ({ id: e.id, label: `${e.name} - ${e.code}` })),
    [equipments],
  );

  // Count points may be expressed in any unit, not just the ones a product is
  // packaged in.
  const { data: uoms } = useUoms();
  const unitOptions = useMemo<IdOption[]>(
    () => (uoms ?? []).map((uom) => ({ id: uom.id, label: uom.name })),
    [uoms],
  );

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

      <form.Field name="equipmentId">
        {(field) => (
          <FieldShell label="Equipment" required error={firstError(field.state.meta.errors)}>
            <IdSelect
              options={equipmentOptions}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select equipment..."
              emptyMessage="This machine has no equipment yet"
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="uomId">
        {(field) => (
          <FieldShell label="Unit" required error={firstError(field.state.meta.errors)}>
            <IdSelect
              options={unitOptions}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select unit..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="role">
        {(field) => (
          <FieldShell label="Role" required error={firstError(field.state.meta.errors)}>
            <EnumSelect
              options={COUNT_ROLES}
              labels={COUNT_ROLE_LABELS}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select role..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="source">
        {(field) => (
          <FieldShell label="Source" required error={firstError(field.state.meta.errors)}>
            <EnumSelect
              options={COUNT_SOURCES}
              labels={COUNT_SOURCE_LABELS}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select source..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="sourceTag">
        {(field) => (
          <FieldShell
            label="Source Tag"
            required
            error={firstError(field.state.meta.errors)}
            hint="PLC address this equipment reports its count on."
          >
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. PLC/WC-01/MITSUM-1/Total_Product"
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

type CountPointFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CountPointTarget | null;
};

function CountPointFormDialog({ open, onOpenChange, target }: CountPointFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Point" : "Add Point"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <CountPointForm
            key={target.item?.id ?? `add-${target.workUnitId}`}
            workUnitId={target.workUnitId}
            item={target.item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { CountPointFormDialog };
export type { CountPointTarget };
