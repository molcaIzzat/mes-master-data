import { useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { useAreas, useCreateProduct, useUoms, useWorkCenters } from "@/lib/queries.js";
import { defaultSkuValues, makePackage, skuSchema } from "@/lib/sku-schema.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { LineMultiSelect } from "@/components/sku/line-multi-select.js";
import { PackageTable } from "@/components/sku/package-table.js";

import type { SkuFormValues } from "@/lib/sku-schema.js";
import type { CreateProductInput } from "@/lib/types.js";
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

function extractError(err: unknown): string {
  const apiError = isAxiosError(err)
    ? (err.response?.data as { error?: string } | undefined)?.error
    : undefined;
  return apiError ?? "Failed to save SKU. Please try again.";
}

function buildPayload(value: SkuFormValues): CreateProductInput {
  return {
    code: value.code.trim(),
    name: value.name.trim(),
    areaId: value.areaId!,
    baseUomId: value.baseUomId!,
    idealRatePerHour: Number(value.cycleTime),
    price: Number(value.price),
    cost: Number(value.cost),
    workCenterIds: value.workCenterIds,
    packages: value.packages.map((p, index) => ({
      main: p.main,
      uomId: p.uomId!,
      sortOrder: index + 1,
      stdWeight: Number(p.stdWeight),
      minWeight: Number(p.minWeight),
      maxWeight: Number(p.maxWeight),
      length: 1,
      width: 1,
      height: 1,
      vol: 1,
      factorToBase: p.main ? 1 : Number(p.factorToBase),
    })),
  };
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

function SkuAdd() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const packageCounter = useRef(1);

  const { data: areas } = useAreas();
  const { data: uoms } = useUoms();

  const form = useForm({
    defaultValues: defaultSkuValues(),
    validators: { onChange: skuSchema, onSubmit: skuSchema },
    onSubmit: async ({ value }) => {
      setErrorMessage(null);
      try {
        await createProduct.mutateAsync(buildPayload(value));
        await navigate({ to: "/sku" });
      } catch (err) {
        setErrorMessage(extractError(err));
      }
    },
  });

  const areaId = useStore(form.store, (s) => s.values.areaId);
  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);

  const { data: workCenters } = useWorkCenters(areaId ?? undefined);
  const uomList = uoms ?? [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-6 rounded-md border p-4 md:p-6">
        {/* Identity */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <FieldShell label="SKU Name" required error={firstError(field.state.meta.errors)}>
                <Input
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Input SKU name here.."
                />
              </FieldShell>
            )}
          </form.Field>
          <form.Field name="code">
            {(field) => (
              <FieldShell label="SKU Code" required error={firstError(field.state.meta.errors)}>
                <Input
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Input SKU code here.."
                />
              </FieldShell>
            )}
          </form.Field>
        </div>

        {/* Area + Line */}
        <div className="grid gap-4 sm:grid-cols-2">
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
                  <SelectTrigger
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select area..." />
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
                <LineMultiSelect
                  options={workCenters ?? []}
                  selectedIds={field.state.value}
                  onChange={field.handleChange}
                  disabled={areaId == null}
                  invalid={field.state.meta.errors.length > 0}
                />
              </FieldShell>
            )}
          </form.Field>
        </div>

        {/* Packaging + Conversion (one array field) */}
        <form.Field name="packages" mode="array">
          {(field) => {
            const rows = field.state.value;
            const mainPackage = rows.find((r) => r.main);
            const mainUom = uomList.find((u) => u.id === mainPackage?.uomId);
            const nonMain = rows.filter((r) => !r.main);

            const changeRow = (index: number, patch: Partial<(typeof rows)[number]>) =>
              field.handleChange(rows.map((p, i) => (i === index ? { ...p, ...patch } : p)));
            const setMain = (index: number) =>
              field.handleChange(rows.map((p, i) => ({ ...p, main: i === index })));
            const removeRow = (index: number) => {
              const next = rows.filter((_, i) => i !== index);
              if (next.length > 0 && !next.some((r) => r.main))
                next[0] = { ...next[0], main: true };
              field.handleChange(next);
            };
            const addRow = () => {
              packageCounter.current += 1;
              field.pushValue(makePackage(`pkg-${packageCounter.current}`));
            };

            return (
              <>
                <div className="flex flex-col gap-2">
                  <Label>
                    Packaging<span className="text-destructive">*</span>
                  </Label>
                  <PackageTable
                    rows={rows}
                    uoms={uomList}
                    submitted={submitted}
                    onChangeRow={changeRow}
                    onSetMain={setMain}
                    onRemove={removeRow}
                    onMove={(from, to) => field.moveValue(from, to)}
                    onAdd={addRow}
                  />
                  {firstError(field.state.meta.errors) && (
                    <p className="text-xs text-destructive">
                      {firstError(field.state.meta.errors)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>
                    Conversion<span className="text-destructive">*</span>
                  </Label>
                  {nonMain.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Add a non-main packaging unit to configure conversion.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {rows.map((pkg, index) => {
                        if (pkg.main) return null;
                        const pkgUom = uomList.find((u) => u.id === pkg.uomId);
                        const unitLabel =
                          mainUom && pkgUom
                            ? `${mainUom.code}/${pkgUom.code}`
                            : "Select units first";
                        return (
                          <div key={pkg.id} className="grid gap-4 sm:grid-cols-2">
                            <Input
                              type="number"
                              min={0}
                              value={pkg.factorToBase}
                              aria-invalid={submitted && !(Number(pkg.factorToBase) > 0)}
                              onChange={(e) => changeRow(index, { factorToBase: e.target.value })}
                              placeholder="0"
                            />
                            <Input value={unitLabel} readOnly disabled />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            );
          }}
        </form.Field>

        {/* Cycle time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="cycleTime">
            {(field) => (
              <FieldShell label="Cycle Time" required error={firstError(field.state.meta.errors)}>
                <Input
                  type="number"
                  min={0}
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Input cycle time.."
                />
              </FieldShell>
            )}
          </form.Field>
          <form.Field name="baseUomId">
            {(field) => (
              <FieldShell
                label="Unit Cycle Time"
                required
                error={firstError(field.state.meta.errors)}
              >
                <Select
                  value={field.state.value ? String(field.state.value) : undefined}
                  onValueChange={(v) => field.handleChange(Number(v))}
                >
                  <SelectTrigger
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uomList.map((uom) => (
                      <SelectItem key={uom.id} value={String(uom.id)}>
                        {uom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
            )}
          </form.Field>
        </div>

        {/* Price + cost */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="price">
            {(field) => (
              <FieldShell label="Price" required error={firstError(field.state.meta.errors)}>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    aria-invalid={field.state.meta.errors.length > 0}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Input price.."
                    className="pr-16"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    rupiah
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">selling price per unit</p>
              </FieldShell>
            )}
          </form.Field>
          <form.Field name="cost">
            {(field) => (
              <FieldShell
                label="Cost of Goods Sold (COGS)"
                required
                error={firstError(field.state.meta.errors)}
              >
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    aria-invalid={field.state.meta.errors.length > 0}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Input cost.."
                    className="pr-16"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    rupiah
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">cost of goods sold per unit</p>
              </FieldShell>
            )}
          </form.Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/sku" })}>
          Discard
        </Button>
        <form.Subscribe
          selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting || createProduct.isPending}>
              {isSubmitting || createProduct.isPending ? "Saving..." : "Save"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

export { SkuAdd };
