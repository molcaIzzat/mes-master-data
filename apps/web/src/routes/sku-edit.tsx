import { Link, useNavigate, useParams } from "@tanstack/react-router";

import { useProduct, useUpdateProduct } from "@/lib/queries.js";
import { Button } from "@/components/ui/button.js";
import { FullPageLoader } from "@/components/full-page-loader.js";
import { SkuForm } from "@/components/sku/sku-form.js";

import type { SkuFormValues } from "@/lib/sku-schema.js";
import type { ProductDetail, UpdateProductInput } from "@/lib/types.js";

// GET returns 0 for empty numerics and a nested `uom` (not uomId); map both into
// the string/nullable form-state shape SkuForm expects.
function productToFormValues(p: ProductDetail): SkuFormValues {
  return {
    name: p.name,
    code: p.code,
    areaId: p.area?.id ?? null,
    workCenterIds: p.workCenters.map((w) => w.id),
    baseUomId: p.baseUom?.id ?? null,
    cycleTime: p.idealRatePerHour ? String(p.idealRatePerHour) : "",
    price: p.price ? String(p.price) : "",
    cost: p.cost ? String(p.cost) : "",
    packages: [...p.packages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pkg, i) => ({
        id: `pkg-${i + 1}`,
        dbId: pkg.id,
        uomId: pkg.uom?.id ?? null,
        main: pkg.main,
        stdWeight: pkg.stdWeight ? String(pkg.stdWeight) : "",
        minWeight: pkg.minWeight ? String(pkg.minWeight) : "",
        maxWeight: pkg.maxWeight ? String(pkg.maxWeight) : "",
        factorToBase: pkg.factorToBase ? String(pkg.factorToBase) : "",
      })),
  };
}

function buildUpdate(value: SkuFormValues): UpdateProductInput {
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
      id: p.dbId, // 0 for newly added rows → inserted via the API's id diff
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

function SkuEdit() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false });
  const productId = Number(id);
  const updateProduct = useUpdateProduct();
  const { data: product, isPending, isError } = useProduct(productId);

  if (!Number.isFinite(productId) || isError || (!isPending && !product)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">SKU not found.</p>
        <Button asChild variant="outline">
          <Link to="/sku">Back to SKU list</Link>
        </Button>
      </div>
    );
  }

  if (isPending || !product) return <FullPageLoader />;

  return (
    <SkuForm
      defaultValues={productToFormValues(product)}
      submitLabel="Save Changes"
      onSubmit={async (value) => {
        await updateProduct.mutateAsync({ id: productId, body: buildUpdate(value) });
        await navigate({ to: "/sku" });
      }}
    />
  );
}

export { SkuEdit };
