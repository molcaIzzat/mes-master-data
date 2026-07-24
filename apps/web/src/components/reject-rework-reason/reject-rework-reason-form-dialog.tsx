import { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { isAxiosError } from "axios";
import { Save } from "lucide-react";

import {
  useAreas,
  useCreateRejectReworkReason,
  useEquipments,
  useUpdateRejectReworkReason,
  useWorkCenters,
} from "@/lib/queries.js";
import {
  defaultRejectReworkReasonValues,
  rejectReworkReasonSchema,
  toFormValues,
  toRequestBody,
} from "@/lib/reject-rework-reason-schema.js";
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
import { MultiSelect } from "@/components/reject-rework-reason/multi-select.js";

import type { RejectReworkReasonListItem } from "@/lib/types.js";
import type { ReactNode } from "react";

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
  return apiError ?? "Failed to save reject & rework reason. Please try again.";
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

type RejectReworkReasonFormProps = {
  item: RejectReworkReasonListItem | null;
  onClose: () => void;
};

// The form body — remounted on each open, so defaultValues reflect the current
// add/edit target. Owns the react-form instance, validation, and submission.
function RejectReworkReasonForm({ item, onClose }: RejectReworkReasonFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createReason = useCreateRejectReworkReason();
  const updateReason = useUpdateRejectReworkReason();

  const { data: areas } = useAreas();
  const { data: equipments } = useEquipments();

  const form = useForm({
    defaultValues: item ? toFormValues(item) : defaultRejectReworkReasonValues(),
    validators: { onChange: rejectReworkReasonSchema, onSubmit: rejectReworkReasonSchema },
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
  const { data: workCenters } = useWorkCenters(areaId ?? undefined);

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
                form.setFieldValue("workCenterIds", []); // lines are area-scoped
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
              onChange={field.handleChange}
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
          <FieldShell label="Machine" required error={firstError(field.state.meta.errors)}>
            <MultiSelect
              options={equipments ?? []}
              selectedIds={field.state.value}
              onChange={field.handleChange}
              placeholder="select one or more machine..."
              emptyText="No machines available."
              invalid={field.state.meta.errors.length > 0}
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="name">
        {(field) => (
          <FieldShell label="Reason" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input reason..."
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

type RejectReworkReasonFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When set, the dialog is in edit mode and prefills from this row.
  item: RejectReworkReasonListItem | null;
};

function RejectReworkReasonFormDialog({
  open,
  onOpenChange,
  item,
}: RejectReworkReasonFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {item ? "Edit Reject & Rework Reason" : "Add Reject & Rework Reason"}
          </DialogTitle>
        </DialogHeader>
        <RejectReworkReasonForm item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export { RejectReworkReasonFormDialog };
