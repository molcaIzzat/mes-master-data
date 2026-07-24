import { useNavigate } from "@tanstack/react-router";

import { useCreateProduct } from "@/lib/queries.js";
import { defaultSkuValues } from "@/lib/sku-schema.js";
import { SkuForm } from "@/components/sku/sku-form.js";

import type { SkuFormValues } from "@/lib/sku-schema.js";
import type { CreateProductInput } from "@/lib/types.js";

function buildCreate(value: SkuFormValues): CreateProductInput {
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

function SkuAdd() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  return (
    <SkuForm
      defaultValues={defaultSkuValues()}
      submitLabel="Save"
      onSubmit={async (value) => {
        await createProduct.mutateAsync(buildCreate(value));
        await navigate({ to: "/sku" });
      }}
    />
  );
}

export { SkuAdd };
