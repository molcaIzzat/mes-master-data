import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { useProductAliases } from "@/lib/queries.js";
import { PAGE_SIZES } from "@/components/table/table-pagination.js";
import { ProductCodeFormDialog } from "@/components/machine-detail/product-code-form-dialog.js";
import { RowActions } from "@/components/table/row-actions.js";
import { SectionTable } from "@/components/table/section-table.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { ProductCodeTarget } from "@/components/machine-detail/product-code-form-dialog.js";
import type { ProductAliasListItem } from "@/lib/types.js";

const columnHelper = createColumnHelper<ProductAliasListItem>();
const EMPTY: ProductAliasListItem[] = [];

type ProductCodeSectionProps = {
  workUnitId: number;
  workCenterId: number;
  onDelete: (target: DeleteMachineChildTarget) => void;
};

// The code a piece of equipment on this machine uses for a product, which is
// rarely the SKU code the plant knows it by.
function ProductCodeSection({ workUnitId, workCenterId, onDelete }: ProductCodeSectionProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ProductCodeTarget | null>(null);

  const { data, isPending, isError } = useProductAliases({ workUnitId, page, size });
  const rows = data?.items ?? EMPTY;

  const openForm = useCallback(
    (item: ProductAliasListItem | null) => {
      setTarget({ workUnitId, workCenterId, item });
      setOpen(true);
    },
    [workUnitId, workCenterId],
  );

  const columns = useMemo<ColumnDef<ProductAliasListItem, unknown>[]>(
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
        id: "equipmentName",
        header: "Equipment Name",
        cell: ({ row }) => row.original.equipment?.name ?? "—",
      }),
      columnHelper.display({
        id: "equipmentCode",
        header: "Equipment Code",
        cell: ({ row }) => row.original.equipment?.code ?? "—",
      }),
      columnHelper.display({
        id: "externalCode",
        header: "External Code",
        cell: ({ row }) => row.original.externalCode,
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        meta: { headerClassName: "w-24 text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <RowActions
            label={`product code ${row.original.externalCode}`}
            onEdit={() => openForm(row.original)}
            onDelete={() =>
              onDelete({
                kind: "product code",
                workUnitId,
                id: row.original.id,
                name: row.original.externalCode,
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
        title="Product Code"
        actionLabel="Add Code"
        onAction={() => openForm(null)}
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.id)}
        isPending={isPending}
        isError={isError}
        errorMessage="Failed to load product codes. Please try again."
        emptyMessage="No product codes yet."
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
      <ProductCodeFormDialog open={open} onOpenChange={setOpen} target={target} />
    </>
  );
}

export { ProductCodeSection };
