import { Loader2, Pencil, Trash2 } from "lucide-react";

import { useProduct } from "@/lib/queries.js";
import { Button } from "@/components/ui/button.js";
import { Checkbox } from "@/components/ui/checkbox.js";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.js";

import type { ReactNode } from "react";

// GET returns 0 for empty numerics; show a dash for missing/zero values.
function fmt(value: number | null): string {
  return value ? String(value) : "-";
}

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

type SkuDetailSheetProps = {
  productId: number | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: number) => void;
  onDelete: (product: { id: number; name: string }) => void;
};

function SkuDetailSheet({ productId, onOpenChange, onEdit, onDelete }: SkuDetailSheetProps) {
  const { data: product, isPending } = useProduct(productId ?? Number.NaN);

  const packages = product ? [...product.packages].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const mainUom = packages.find((p) => p.main)?.uom;
  const nonMain = packages.filter((p) => !p.main);

  return (
    <Sheet open={productId != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>Detail SKU</SheetTitle>
          <SheetDescription className="sr-only">Read-only SKU details.</SheetDescription>
        </SheetHeader>

        {productId != null && (isPending || !product) ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        ) : product ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <InfoField label="SKU Name">{product.name}</InfoField>
                <InfoField label="Line">
                  {product.workCenters.map((w) => w.name).join(", ") || "-"}
                </InfoField>
                <InfoField label="Area">{product.area?.name ?? "-"}</InfoField>
                <InfoField label="Price">{fmt(product.price)}</InfoField>
                <InfoField label="Cycle Time">{fmt(product.idealRatePerHour)}</InfoField>
                <InfoField label="Cost Of Goods Sold (COGS)">{fmt(product.cost)}</InfoField>
                <InfoField label="Unit Cycle Time">{product.baseUom?.name ?? "-"}</InfoField>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Packaging</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead className="w-20 text-center">Main Unit</TableHead>
                        <TableHead>Packaging</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Min Weight</TableHead>
                        <TableHead>Max Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg, index) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox checked={pkg.main} disabled aria-label="Main unit" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{pkg.uom?.code ?? "-"}</TableCell>
                          <TableCell>{fmt(pkg.stdWeight)}</TableCell>
                          <TableCell>{fmt(pkg.minWeight)}</TableCell>
                          <TableCell>{fmt(pkg.maxWeight)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Conversion</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonMain.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No conversion units.
                          </TableCell>
                        </TableRow>
                      ) : (
                        nonMain.map((pkg, index) => (
                          <TableRow key={pkg.id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell>{pkg.factorToBase}</TableCell>
                            <TableCell>
                              {mainUom && pkg.uom ? `${mainUom.code}/${pkg.uom.code}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <SheetFooter className="flex-row justify-between border-t">
              <Button
                variant="destructive"
                onClick={() => onDelete({ id: product.id, name: product.name })}
              >
                <Trash2 />
                Delete
              </Button>
              <Button variant="outline" onClick={() => onEdit(product.id)}>
                <Pencil />
                Edit
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export { SkuDetailSheet };
