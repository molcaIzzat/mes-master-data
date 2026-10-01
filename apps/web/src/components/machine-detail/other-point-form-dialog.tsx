import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import {
  useCreateOtherPoint,
  useEquipmentsByWorkUnit,
  useUpdateOtherPoint,
} from "@/lib/queries.js";
import {
  OTHER_DATA_TYPE_LABELS,
  OTHER_ROLE_LABELS,
  defaultOtherPointValues,
  otherPointSchema,
  toOtherPointFormValues,
  toOtherPointRequestBody,
} from "@/lib/machine-detail-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { OTHER_DATA_TYPES, OTHER_ROLES } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { EnumSelect } from "@/components/form/enum-select.js";
import { IdSelect } from "@/components/form/id-select.js";

import type { IdOption } from "@/components/form/id-select.js";
import type { OtherPointListItem } from "@/lib/types.js";

type OtherPointTarget = {
  workUnitId: number;
  item: OtherPointListItem | null;
};

type OtherPointFormProps = OtherPointTarget & {
  onClose: () => void;
};

function OtherPointForm({ workUnitId, item, onClose }: OtherPointFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createPoint = useCreateOtherPoint();
  const updatePoint = useUpdateOtherPoint();

  const form = useForm({
    defaultValues: item ? toOtherPointFormValues(item) : defaultOtherPointValues(),
    validators: { onChange: otherPointSchema, onSubmit: otherPointSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toOtherPointRequestBody(value);
      try {
        if (item) {
          await updatePoint.mutateAsync({ workUnitId, id: item.id, body });
        } else {
          await createPoint.mutateAsync({ workUnitId, body });
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the other point. Please try again."));
      }
    },
  });

  const { data: equipments } = useEquipmentsByWorkUnit(workUnitId);
  const equipmentOptions = useMemo<IdOption[]>(
    () => (equipments ?? []).map((e) => ({ id: e.id, label: `${e.name} - ${e.code}` })),
    [equipments],
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

      <form.Field name="role">
        {(field) => (
          <FieldShell
            label="Role"
            required
            error={firstError(field.state.meta.errors)}
            hint="What the signal explains: why the machine stopped, or why a unit was rejected."
          >
            <EnumSelect
              options={OTHER_ROLES}
              labels={OTHER_ROLE_LABELS}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select role..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="dataType">
        {(field) => (
          <FieldShell
            label="Data Type"
            required
            error={firstError(field.state.meta.errors)}
            hint="How the edge reads the tag. Reason signals are usually a boolean."
          >
            <EnumSelect
              options={OTHER_DATA_TYPES}
              labels={OTHER_DATA_TYPE_LABELS}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select data type..."
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
            hint="PLC address this equipment raises the reason on."
          >
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. PLC/FI2-L1/MITSUM-1/Machine_Stop"
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

type OtherPointFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: OtherPointTarget | null;
};

function OtherPointFormDialog({ open, onOpenChange, target }: OtherPointFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Point" : "Add Point"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <OtherPointForm
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

export { OtherPointFormDialog };
export type { OtherPointTarget };
