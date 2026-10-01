import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import { useCreateEdge, useUpdateEdge, useWorkUnitsByWorkCenter } from "@/lib/queries.js";
import {
  defaultFlowValues,
  flowSchema,
  toFlowFormValues,
  toFlowRequestBody,
} from "@/lib/line-detail-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { IdSelect } from "@/components/form/id-select.js";

import type { IdOption } from "@/components/form/id-select.js";
import type { EdgeListItem } from "@/lib/types.js";

// The line is fixed by the page; `item` is null when adding.
type FlowTarget = {
  workCenterId: number;
  item: EdgeListItem | null;
};

type FlowFormProps = FlowTarget & {
  onClose: () => void;
};

function FlowForm({ workCenterId, item, onClose }: FlowFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createFlow = useCreateEdge();
  const updateFlow = useUpdateEdge();

  const form = useForm({
    defaultValues: item ? toFlowFormValues(item) : defaultFlowValues(),
    validators: { onChange: flowSchema, onSubmit: flowSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toFlowRequestBody(value);
      try {
        if (item) {
          await updateFlow.mutateAsync({ workCenterId, id: item.id, body });
        } else {
          await createFlow.mutateAsync({ workCenterId, body });
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the flow. Please try again."));
      }
    },
  });

  // Both ends of a flow are machines on this line.
  const { data: machines } = useWorkUnitsByWorkCenter(workCenterId);
  const machineOptions = useMemo<IdOption[]>(
    () => (machines ?? []).map((m) => ({ id: m.id, label: `${m.name} - ${m.code}` })),
    [machines],
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

      <form.Field name="fromWorkUnitId">
        {(field) => (
          <FieldShell label="From" required error={firstError(field.state.meta.errors)}>
            <IdSelect
              options={machineOptions}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select machine..."
              emptyMessage="This line has no machines yet"
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="toWorkUnitId">
        {(field) => (
          <FieldShell label="To" required error={firstError(field.state.meta.errors)}>
            <IdSelect
              options={machineOptions}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select machine..."
              emptyMessage="This line has no machines yet"
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

type FlowFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: FlowTarget | null;
};

function FlowFormDialog({ open, onOpenChange, target }: FlowFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Flow" : "Add Flow"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <FlowForm
            key={target.item?.id ?? `add-${target.workCenterId}`}
            workCenterId={target.workCenterId}
            item={target.item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { FlowFormDialog };
export type { FlowTarget };
