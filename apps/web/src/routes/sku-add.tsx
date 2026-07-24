import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { useAreas, useCreateProduct, useUoms, useWorkCenters } from "@/lib/queries.js";
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
import { newPackageRow, PackageTable } from "@/components/sku/package-table.js";

import type { PackageRow } from "@/components/sku/package-table.js";
import type { CreateProductInput } from "@/lib/types.js";
import type { ReactNode } from "react";

const MIN_TEXT_LEN = 3;

function isPositive(value: string): boolean {
  return Number(value) > 0;
}

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SkuAdd() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [areaId, setAreaId] = useState<number | undefined>(undefined);
  const [workCenterIds, setWorkCenterIds] = useState<number[]>([]);
  const [baseUomId, setBaseUomId] = useState<number | undefined>(undefined);
  const [cycleTime, setCycleTime] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [packages, setPackages] = useState<PackageRow[]>(() => [newPackageRow("pkg-1", true)]);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const packageCounter = useRef(1);

  const { data: areas } = useAreas();
  const { data: uoms } = useUoms();
  const { data: workCenters } = useWorkCenters(areaId);
  const createProduct = useCreateProduct();

  const uomList = uoms ?? [];
  const mainPackage = packages.find((p) => p.main);
  const mainUom = uomList.find((u) => u.id === mainPackage?.uomId);
  const nonMainPackages = packages.filter((p) => !p.main);

  function updatePackage(id: string, patch: Partial<PackageRow>) {
    setPackages((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function setMain(id: string) {
    setPackages((rows) => rows.map((r) => ({ ...r, main: r.id === id })));
  }

  function removePackage(id: string) {
    setPackages((rows) => {
      const next = rows.filter((r) => r.id !== id);
      // Keep exactly one main: if we removed it, promote the first remaining row.
      if (next.length > 0 && !next.some((r) => r.main)) next[0] = { ...next[0], main: true };
      return next;
    });
  }

  function addPackage() {
    packageCounter.current += 1;
    setPackages((rows) => [
      ...rows,
      newPackageRow(`pkg-${packageCounter.current}`, rows.length === 0),
    ]);
  }

  function handleAreaChange(value: string) {
    setAreaId(Number(value));
    setWorkCenterIds([]); // lines are area-scoped; reset when the area changes
  }

  function isValid(): boolean {
    if (name.trim().length < MIN_TEXT_LEN || code.trim().length < MIN_TEXT_LEN) return false;
    if (areaId == null || baseUomId == null) return false;
    if (workCenterIds.length === 0) return false;
    if (!isPositive(cycleTime) || !isPositive(price) || !isPositive(cost)) return false;
    if (packages.length === 0) return false;
    if (packages.filter((p) => p.main).length !== 1) return false;
    for (const p of packages) {
      if (p.uomId == null) return false;
      if (!isPositive(p.stdWeight) || !isPositive(p.minWeight) || !isPositive(p.maxWeight)) {
        return false;
      }
      if (!p.main && !isPositive(p.factorToBase)) return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setErrorMessage(null);
    if (!isValid()) return;

    const payload: CreateProductInput = {
      code: code.trim(),
      name: name.trim(),
      areaId: areaId!,
      baseUomId: baseUomId!,
      idealRatePerHour: Number(cycleTime),
      price: Number(price),
      cost: Number(cost),
      workCenterIds,
      packages: packages.map((p, index) => ({
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

    createProduct.mutate(payload, {
      onSuccess: () => navigate({ to: "/sku" }),
      onError: (err) => {
        const apiError = isAxiosError(err)
          ? (err.response?.data as { error?: string } | undefined)?.error
          : undefined;
        setErrorMessage(apiError ?? "Failed to save SKU. Please try again.");
      },
    });
  }

  const invalidText = (value: string) => submitted && value.trim().length < MIN_TEXT_LEN;
  const invalidNumber = (value: string) => submitted && !isPositive(value);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-6 rounded-md border p-4 md:p-6">
        {/* Identity */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU Name" required>
            <Input
              value={name}
              aria-invalid={invalidText(name)}
              onChange={(e) => setName(e.target.value)}
              placeholder="Input SKU name here.."
            />
          </Field>
          <Field label="SKU Code" required>
            <Input
              value={code}
              aria-invalid={invalidText(code)}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Input SKU code here.."
            />
          </Field>
        </div>

        {/* Area + Line */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Area" required>
            <Select value={areaId ? String(areaId) : undefined} onValueChange={handleAreaChange}>
              <SelectTrigger aria-invalid={submitted && areaId == null} className="w-full">
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
          </Field>
          <Field label="Line" required>
            <LineMultiSelect
              options={workCenters ?? []}
              selectedIds={workCenterIds}
              onChange={setWorkCenterIds}
              disabled={areaId == null}
              invalid={submitted && workCenterIds.length === 0}
            />
          </Field>
        </div>

        {/* Packaging */}
        <div className="flex flex-col gap-2">
          <Label>
            Packaging<span className="text-destructive">*</span>
          </Label>
          <PackageTable
            rows={packages}
            uoms={uomList}
            submitted={submitted}
            onChange={updatePackage}
            onSetMain={setMain}
            onRemove={removePackage}
            onReorder={setPackages}
            onAdd={addPackage}
          />
        </div>

        {/* Conversion */}
        <div className="flex flex-col gap-2">
          <Label>
            Conversion<span className="text-destructive">*</span>
          </Label>
          {nonMainPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a non-main packaging unit to configure conversion.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {nonMainPackages.map((pkg) => {
                const pkgUom = uomList.find((u) => u.id === pkg.uomId);
                const unitLabel =
                  mainUom && pkgUom ? `${mainUom.code}/${pkgUom.code}` : "Select units first";
                return (
                  <div key={pkg.id} className="grid gap-4 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      value={pkg.factorToBase}
                      aria-invalid={invalidNumber(pkg.factorToBase)}
                      onChange={(e) => updatePackage(pkg.id, { factorToBase: e.target.value })}
                      placeholder="0"
                    />
                    <Input value={unitLabel} readOnly disabled />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cycle time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cycle Time" required>
            <Input
              type="number"
              min={0}
              value={cycleTime}
              aria-invalid={invalidNumber(cycleTime)}
              onChange={(e) => setCycleTime(e.target.value)}
              placeholder="Input cycle time.."
            />
          </Field>
          <Field label="Unit Cycle Time" required>
            <Select
              value={baseUomId ? String(baseUomId) : undefined}
              onValueChange={(v) => setBaseUomId(Number(v))}
            >
              <SelectTrigger aria-invalid={submitted && baseUomId == null} className="w-full">
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
          </Field>
        </div>

        {/* Price + cost */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" required>
            <div className="relative">
              <Input
                type="number"
                min={0}
                value={price}
                aria-invalid={invalidNumber(price)}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Input price.."
                className="pr-16"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                rupiah
              </span>
            </div>
            <p className="text-xs text-muted-foreground">selling price per unit</p>
          </Field>
          <Field label="Cost of Goods Sold (COGS)" required>
            <div className="relative">
              <Input
                type="number"
                min={0}
                value={cost}
                aria-invalid={invalidNumber(cost)}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Input cost.."
                className="pr-16"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                rupiah
              </span>
            </div>
            <p className="text-xs text-muted-foreground">cost of goods sold per unit</p>
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/sku" })}>
          Discard
        </Button>
        <Button type="submit" disabled={createProduct.isPending}>
          {createProduct.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export { SkuAdd };
