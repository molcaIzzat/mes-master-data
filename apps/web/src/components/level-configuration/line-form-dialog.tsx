import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import {
  useAreas,
  useCreateWorkCenter,
  useUpdateWorkCenter,
  useWorkCenterClasses,
} from "@/lib/queries.js";
import {
  defaultLineValues,
  lineSchema,
  toLineFormValues,
  toLineRequestBody,
} from "@/lib/level-configuration-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { ClassSelect } from "@/components/level-configuration/class-select.js";

import type { LevelConfigurationListItem } from "@/lib/types.js";

type LineFormProps = {
  item: LevelConfigurationListItem | null;
  onClose: () => void;
};

function LineForm({ item, onClose }: LineFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createLine = useCreateWorkCenter();
  const updateLine = useUpdateWorkCenter();

  const { data: areas } = useAreas();
  const { data: classes } = useWorkCenterClasses();

  const form = useForm({
    defaultValues: item ? toLineFormValues(item) : defaultLineValues(),
    validators: { onChange: lineSchema, onSubmit: lineSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toLineRequestBody(value);
      try {
        if (item) {
          await updateLine.mutateAsync({ id: item.id, body });
        } else {
          await createLine.mutateAsync(body);
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the line. Please try again."));
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

      <form.Field name="areaId">
        {(field) => (
          <FieldShell label="Area" required error={firstError(field.state.meta.errors)}>
            <Select
              value={field.state.value ? String(field.state.value) : undefined}
              onValueChange={(v) => field.handleChange(Number(v))}
            >
              <SelectTrigger aria-invalid={field.state.meta.errors.length > 0} className="w-full">
                <SelectValue placeholder="select area..." />
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

      <form.Field name="name">
        {(field) => (
          <FieldShell label="Line Name" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input line name..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="code">
        {(field) => (
          <FieldShell label="Line Code" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input line code..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="workCenterClassId">
        {(field) => (
          <FieldShell label="Category" error={firstError(field.state.meta.errors)}>
            <ClassSelect
              options={classes}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select category..."
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

type LineFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When set, the dialog is in edit mode and prefills from this row.
  item: LevelConfigurationListItem | null;
};

function LineFormDialog({ open, onOpenChange, item }: LineFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{item ? "Edit Line" : "Add Line"}</DialogTitle>
        </DialogHeader>
        {/* Keyed so switching between add and different edit targets remounts the
            form and picks up the new defaultValues. */}
        <LineForm key={item?.id ?? "add"} item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export { LineFormDialog };
