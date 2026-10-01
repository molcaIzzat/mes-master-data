import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { useProductSpecs } from "@/lib/queries.js";
import { PAGE_SIZES } from "@/components/table/table-pagination.js";
import { RowActions } from "@/components/table/row-actions.js";
import { SectionTable } from "@/components/table/section-table.js";
import { SpecificationFormDialog } from "@/components/machine-detail/specification-form-dialog.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { SpecificationTarget } from "@/components/machine-detail/specification-form-dialog.js";
import type { ProductSpecListItem } from "@/lib/types.js";

const columnHelper = createColumnHelper<ProductSpecListItem>();
const EMPTY: ProductSpecListItem[] = [];

type SpecificationSectionProps = {
  workUnitId: number;
  workCenterId: number;
  onDelete: (target: DeleteMachineChildTarget) => void;
};

// Per-product cycle time for this machine.
function SpecificationSection({ workUnitId, workCenterId, onDelete }: SpecificationSectionProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<SpecificationTarget | null>(null);

  const { data, isPending, isError } = useProductSpecs({ workUnitId, page, size });
  const rows = data?.items ?? EMPTY;

  const openForm = useCallback(
    (item: ProductSpecListItem | null) => {
      setTarget({ workUnitId, workCenterId, item });
      setOpen(true);
    },
    [workUnitId, workCenterId],
  );

  const columns = useMemo<ColumnDef<ProductSpecListItem, unknown>[]>(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => (page - 1) * size + row.index + 1,
      }),
      columnHelper.display({
        id: "skuName",
        header: "SKU Name",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => row.original.product?.name ?? "—",
      }),
      columnHelper.display({
        id: "skuCode",
        header: "SKU Code",
        cell: ({ row }) => row.original.product?.code ?? "—",
      }),
      columnHelper.display({
        id: "cycleTime",
        header: "Cycle Time",
        cell: ({ row }) => row.original.idealRatePerHour,
      }),
      columnHelper.display({
        id: "unit",
        header: "Unit",
        cell: ({ row }) => row.original.uom?.code ?? "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        meta: { headerClassName: "w-24 text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <RowActions
            label={`specification for ${row.original.product?.name ?? "this product"}`}
            onEdit={() => openForm(row.original)}
            onDelete={() =>
              onDelete({
                kind: "specification",
                workUnitId,
                id: row.original.id,
                name: row.original.product?.name ?? "this specification",
              })
            }
          />
        ),
      }),
    ],
    [page, size, workUnitId, onDelete, openForm],
  );

  return (
    <>
      <SectionTable
        title="Product Specification"
        actionLabel="Add Specification"
        onAction={() => openForm(null)}
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.id)}
        isPending={isPending}
        isError={isError}
        errorMessage="Failed to load product specifications. Please try again."
        emptyMessage="No product specifications yet."
        pagination={{
          page,
          size,
          meta: data?.meta,
          onPageChange: setPage,
          onSizeChange: (value) => {
            setSize(value);
            setPage(1);
          },
        }}
      />
      <SpecificationFormDialog open={open} onOpenChange={setOpen} target={target} />
    </>
  );
}

export { SpecificationSection };
