import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import {
  useCreateProductAlias,
  useEquipmentsByWorkUnit,
  useProducts,
  useUpdateProductAlias,
} from "@/lib/queries.js";
import {
  defaultProductCodeValues,
  productCodeSchema,
  toProductCodeFormValues,
  toProductCodeRequestBody,
} from "@/lib/machine-detail-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { IdSelect } from "@/components/form/id-select.js";

import type { IdOption } from "@/components/form/id-select.js";
import type { ProductAliasListItem } from "@/lib/types.js";

type ProductCodeTarget = {
  workUnitId: number;
  workCenterId: number;
  item: ProductAliasListItem | null;
};

type ProductCodeFormProps = ProductCodeTarget & {
  onClose: () => void;
};

function ProductCodeForm({ workUnitId, workCenterId, item, onClose }: ProductCodeFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createAlias = useCreateProductAlias();
  const updateAlias = useUpdateProductAlias();

  const form = useForm({
    defaultValues: item ? toProductCodeFormValues(item) : defaultProductCodeValues(),
    validators: { onChange: productCodeSchema, onSubmit: productCodeSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toProductCodeRequestBody(value);
      try {
        if (item) {
          await updateAlias.mutateAsync({ workUnitId, id: item.id, body });
        } else {
          await createAlias.mutateAsync({ workUnitId, body });
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the product code. Please try again."));
      }
    },
  });

  const { data: products } = useProducts({ page: 1, size: 100, workCenterId });
  const productOptions = useMemo<IdOption[]>(
    () => (products?.items ?? []).map((p) => ({ id: p.id, label: `${p.name} - ${p.code}` })),
    [products],
  );

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

      <form.Field name="productId">
        {(field) => (
          <FieldShell label="Product" required error={firstError(field.state.meta.errors)}>
            <IdSelect
              options={productOptions}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="select product..."
              emptyMessage="No products assigned to this line"
            />
          </FieldShell>
        )}
      </form.Field>

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

      <form.Field name="externalCode">
        {(field) => (
          <FieldShell label="External Code" required error={firstError(field.state.meta.errors)}>
            <Input
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input external code..."
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

type ProductCodeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ProductCodeTarget | null;
};

function ProductCodeFormDialog({ open, onOpenChange, target }: ProductCodeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Code" : "Add Code"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <ProductCodeForm
            key={target.item?.id ?? `add-${target.workUnitId}`}
            workUnitId={target.workUnitId}
            workCenterId={target.workCenterId}
            item={target.item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ProductCodeFormDialog };
export type { ProductCodeTarget };
