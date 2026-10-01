import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";

import {
  useCreateProductSpec,
  useProduct,
  useProducts,
  useUpdateProductSpec,
} from "@/lib/queries.js";
import {
  defaultSpecificationValues,
  specificationSchema,
  toSpecificationFormValues,
  toSpecificationRequestBody,
} from "@/lib/machine-detail-schema.js";
import { extractError, firstError } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { FieldShell } from "@/components/form/field-shell.js";
import { IdSelect } from "@/components/form/id-select.js";

import type { IdOption } from "@/components/form/id-select.js";
import type { ProductSpecListItem } from "@/lib/types.js";

// The machine and its line come from the page; `item` is null when adding.
type SpecificationTarget = {
  workUnitId: number;
  workCenterId: number;
  item: ProductSpecListItem | null;
};

type SpecificationFormProps = SpecificationTarget & {
  onClose: () => void;
};

function SpecificationForm({ workUnitId, workCenterId, item, onClose }: SpecificationFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Mirrors the product field so the unit list can follow it; the form state
  // itself is not readable from render without a subscription.
  const [productId, setProductId] = useState<number | null>(item?.product?.id ?? null);
  const createSpec = useCreateProductSpec();
  const updateSpec = useUpdateProductSpec();

  const form = useForm({
    defaultValues: item ? toSpecificationFormValues(item) : defaultSpecificationValues(),
    validators: { onChange: specificationSchema, onSubmit: specificationSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      const body = toSpecificationRequestBody(value);
      try {
        if (item) {
          await updateSpec.mutateAsync({ workUnitId, id: item.id, body });
        } else {
          await createSpec.mutateAsync({ workUnitId, body });
        }
        onClose();
      } catch (err) {
        setErrorMessage(extractError(err, "Failed to save the specification. Please try again."));
      }
    },
  });

  // Only the products assigned to this machine's line can be specified on it.
  const { data: products } = useProducts({ page: 1, size: 100, workCenterId });
  const productOptions = useMemo<IdOption[]>(
    () => (products?.items ?? []).map((p) => ({ id: p.id, label: `${p.name} - ${p.code}` })),
    [products],
  );

  // The unit has to be one the product is packaged in, which only the product
  // detail response lists.
  const { data: product } = useProduct(productId ?? Number.NaN);
  const unitOptions = useMemo<IdOption[]>(
    () =>
      (product?.packages ?? [])
        .map((pkg) => pkg.uom)
        .filter((uom) => uom != null)
        .map((uom) => ({ id: uom.id, label: uom.name })),
    [product],
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
              onChange={(value) => {
                // The unit list comes from the product's packages, so a change
                // of product invalidates whatever unit was picked.
                field.handleChange(value);
                setProductId(value);
                if (value !== productId) form.setFieldValue("uomId", null);
              }}
              placeholder="select product..."
              emptyMessage="No products assigned to this line"
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
              disabled={productId == null}
              emptyMessage={
                productId == null ? "Select a product first" : "This product has no packaging units"
              }
            />
          </FieldShell>
        )}
      </form.Field>

      <form.Field name="cycleTime">
        {(field) => (
          <FieldShell label="Cycle Time" required error={firstError(field.state.meta.errors)}>
            <Input
              type="number"
              min={1}
              step={1}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="input cycle time..."
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

type SpecificationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SpecificationTarget | null;
};

function SpecificationFormDialog({ open, onOpenChange, target }: SpecificationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {target?.item ? "Edit Specification" : "Add Specification"}
          </DialogTitle>
        </DialogHeader>
        {target && (
          <SpecificationForm
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

export { SpecificationFormDialog };
export type { SpecificationTarget };
