import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { isAxiosError } from "axios";
import { Check, Save } from "lucide-react";

import { useCreateDowntimeAction, useUpdateDowntimeAction } from "@/lib/queries.js";
import {
  ACTION_COLORS,
  defaultDowntimeActionValues,
  downtimeActionSchema,
  slugifyActionCode,
  toFormValues,
  toRequestBody,
} from "@/lib/downtime-action-schema.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { cn } from "@/lib/utils.js";

import type { DowntimeActionListItem } from "@/lib/types.js";
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
  return apiError ?? "Failed to save downtime action. Please try again.";
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

type ColorPickerProps = {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
};

// A fixed palette rather than a native colour input — see ACTION_COLORS for why.
function ColorPicker({ value, onChange, invalid }: ColorPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Action colour"
      aria-invalid={invalid}
      className="flex flex-wrap gap-2"
    >
      {ACTION_COLORS.map((color) => {
        const selected = color.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.value)}
            // Inline style is the one place it is correct here: the value IS the
            // colour, so there is no semantic token that could carry it.
            style={{ backgroundColor: color.value }}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-transform",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              selected ? "ring-2 ring-foreground ring-offset-2" : "hover:scale-110",
            )}
          >
            {selected && <Check className="size-4 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

type DowntimeActionFormProps = {
  item: DowntimeActionListItem | null;
  onClose: () => void;
};

// The form body — remounted on each open, so defaultValues reflect the current
// add/edit target.
function DowntimeActionForm({ item, onClose }: DowntimeActionFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Whether the operator has taken the code over. Until they do, typing a name
  // keeps the code in step — which is what makes the common case one field
  // instead of two, and matches how the OEE monitor derives a code when it
  // creates an action on Enter.
  //
  // EDITING NEVER AUTO-DERIVES: a code is the unique key upstream, so silently
  // rewriting it because somebody fixed a typo in the name would orphan the row
  // from anything referring to it.
  const [codeTouched, setCodeTouched] = useState(item !== null);

  const createAction = useCreateDowntimeAction();
  const updateAction = useUpdateDowntimeAction();

  const form = useForm({
    defaultValues: item ? toFormValues(item) : defaultDowntimeActionValues(),
    validators: { onChange: downtimeActionSchema, onSubmit: downtimeActionSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toRequestBody(value);
      try {
        if (item) {
          await updateAction.mutateAsync({ id: item.id, body });
        } else {
          await createAction.mutateAsync(body);
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err));
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

      <form.Field name="name">
        {(field) => (
          <FieldShell label="Action" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => {
                field.handleChange(e.target.value);
                if (!codeTouched) form.setFieldValue("code", slugifyActionCode(e.target.value));
              }}
              placeholder="input action..."
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
              onChange={(e) => {
                setCodeTouched(true);
                field.handleChange(e.target.value);
              }}
              placeholder="input code..."
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="color">
        {(field) => (
          <FieldShell label="Colour" required error={firstError(field.state.meta.errors)}>
            <ColorPicker
              value={field.state.value}
              onChange={field.handleChange}
              invalid={field.state.meta.errors.length > 0}
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

type DowntimeActionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When set, the dialog is in edit mode and prefills from this row.
  item: DowntimeActionListItem | null;
};

function DowntimeActionFormDialog({ open, onOpenChange, item }: DowntimeActionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {item ? "Edit Downtime Action" : "Add Downtime Action"}
          </DialogTitle>
        </DialogHeader>
        {/* Keyed so the form remounts per target: defaultValues are read once. */}
        <DowntimeActionForm
          key={item?.id ?? "new"}
          item={item}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export { DowntimeActionFormDialog };
