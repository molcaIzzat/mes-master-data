import { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { isAxiosError } from "axios";
import { Save } from "lucide-react";

import {
  useAreas,
  useCreateDowntimeReason,
  useEquipmentsByWorkCenters,
  useUpdateDowntimeReason,
  useWorkCenters,
} from "@/lib/queries.js";
import {
  defaultDowntimeReasonValues,
  downtimeReasonSchema,
  toFormValues,
  toRequestBody,
} from "@/lib/downtime-reason-schema.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { MultiSelect } from "@/components/downtime-reason/multi-select.js";
import { formatEquipmentLabel } from "@/lib/utils.js";

import type { DowntimeReasonCategory, DowntimeReasonListItem } from "@/lib/types.js";
import type { ReactNode } from "react";

const CATEGORIES: DowntimeReasonCategory[] = ["PLANNED", "UNPLANNED", "SMALL_STOP"];

// Standard Schema (zod) surfaces errors as issue objects; pull the first message.
function firstError(errors: unknown[]): string | undefined {
  const e = errors[0];
  if (e == null) return undefined;
  if (typeof e === "string") return e;
  if (typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return undefined;
}

// Prefer the API's error envelope message (e.g. duplicate code) over a generic one.
function extractError(err: unknown): string {
  const apiError = isAxiosError(err)
    ? (err.response?.data as { error?: string } | undefined)?.error
    : undefined;
  return apiError ?? "Failed to save downtime reason. Please try again.";
}

type FieldShellProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

function FieldShell({ label, required, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type DowntimeReasonFormProps = {
  item: DowntimeReasonListItem | null;
  onClose: () => void;
};

// The form body — remounted on each open, so defaultValues reflect the current
// add/edit target. Owns the react-form instance, validation, and submission.
function DowntimeReasonForm({ item, onClose }: DowntimeReasonFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createReason = useCreateDowntimeReason();
  const updateReason = useUpdateDowntimeReason();

  const { data: areas } = useAreas();

  const form = useForm({
    defaultValues: item ? toFormValues(item) : defaultDowntimeReasonValues(),
    validators: { onChange: downtimeReasonSchema, onSubmit: downtimeReasonSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toRequestBody(value);
      try {
        if (item) {
          await updateReason.mutateAsync({ id: item.id, body });
        } else {
          await createReason.mutateAsync(body);
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err));
      }
    },
  });

  const areaId = useStore(form.store, (s) => s.values.areaId);
  const workCenterIds = useStore(form.store, (s) => s.values.workCenterIds);
  const { data: workCenters } = useWorkCenters(areaId ?? undefined);
  const { data: equipments } = useEquipmentsByWorkCenters(workCenterIds);
  const equipmentOptions = (equipments ?? []).map((e) => ({
    id: e.id,
    name: formatEquipmentLabel(e),
  }));

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

      <form.Field name="areaId">
        {(field) => (
          <FieldShell label="Area" required error={firstError(field.state.meta.errors)}>
            <Select
              value={field.state.value ? String(field.state.value) : undefined}
              onValueChange={(v) => {
                field.handleChange(Number(v));
                // Lines are area-scoped and equipment is line-scoped; reset both.
                form.setFieldValue("workCenterIds", []);
                form.setFieldValue("equipmentIds", []);
              }}
            >
              <SelectTrigger aria-invalid={field.state.meta.errors.length > 0} className="w-full">
                <SelectValue placeholder="select area" />
              </SelectTrigger>
              <SelectContent>
                {areas?.map((area) => (
                  <SelectItem key={area.id} value={String(area.id)}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="workCenterIds">
        {(field) => (
          <FieldShell label="Line" required error={firstError(field.state.meta.errors)}>
            <MultiSelect
              options={workCenters ?? []}
              selectedIds={field.state.value}
              onChange={(ids) => {
                field.handleChange(ids);
                form.setFieldValue("equipmentIds", []); // equipment is line-scoped
              }}
              placeholder="select line..."
              emptyText="No lines available."
              disabled={areaId == null}
              invalid={field.state.meta.errors.length > 0}
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="equipmentIds">
        {(field) => (
          <FieldShell label="Equipment" required error={firstError(field.state.meta.errors)}>
            <MultiSelect
              options={equipmentOptions}
              selectedIds={field.state.value}
              onChange={field.handleChange}
              placeholder="select one or more equipment..."
              emptyText="No equipment available."
              disabled={workCenterIds.length === 0}
              invalid={field.state.meta.errors.length > 0}
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="category">
        {(field) => (
          <FieldShell
            label="Downtime Category"
            required
            error={firstError(field.state.meta.errors)}
          >
            <Select
              value={field.state.value ?? undefined}
              onValueChange={(v) => field.handleChange(v as DowntimeReasonCategory)}
            >
              <SelectTrigger aria-invalid={field.state.meta.errors.length > 0} className="w-full">
                <SelectValue placeholder="select downtime category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="name">
        {(field) => (
          <FieldShell label="Downtime Reason" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input downtime reason..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="code">
        {(field) => (
          <FieldShell label="Code" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input code..."
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

type DowntimeReasonFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When set, the dialog is in edit mode and prefills from this row.
  item: DowntimeReasonListItem | null;
};

function DowntimeReasonFormDialog({ open, onOpenChange, item }: DowntimeReasonFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {item ? "Edit Downtime Reason" : "Add Downtime Reason"}
          </DialogTitle>
        </DialogHeader>
        <DowntimeReasonForm item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export { DowntimeReasonFormDialog };
