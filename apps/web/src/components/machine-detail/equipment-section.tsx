import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { useEquipmentsPage } from "@/lib/queries.js";
import { PAGE_SIZES } from "@/components/table/table-pagination.js";
import { EquipmentFormDialog } from "@/components/level-configuration/equipment-form-dialog.js";
import { RowActions } from "@/components/machine-detail/row-actions.js";
import { SectionTable } from "@/components/machine-detail/section-table.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { EquipmentTarget } from "@/components/level-configuration/equipment-form-dialog.js";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { EquipmentListItem } from "@/lib/types.js";

const columnHelper = createColumnHelper<EquipmentListItem>();
const EMPTY: EquipmentListItem[] = [];

type EquipmentSectionProps = {
  workUnitId: number;
  workUnitName: string;
  onDelete: (target: DeleteMachineChildTarget) => void;
};

// The equipment belonging to this machine. Add/edit reuse the same dialog the
// level configuration tree opens.
function EquipmentSection({ workUnitId, workUnitName, onDelete }: EquipmentSectionProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<EquipmentTarget | null>(null);

  const { data, isPending, isError } = useEquipmentsPage({ workUnitId, page, size });
  const rows = data?.items ?? EMPTY;

  const openForm = useCallback(
    (item: EquipmentListItem | null) => {
      setTarget({ unit: { id: workUnitId, name: workUnitName }, item });
      setOpen(true);
    },
    [workUnitId, workUnitName],
  );

  const columns = useMemo<ColumnDef<EquipmentListItem, unknown>[]>(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => (page - 1) * size + row.index + 1,
      }),
      columnHelper.display({
        id: "name",
        header: "Name",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => row.original.name,
      }),
      columnHelper.display({
        id: "code",
        header: "Code",
        cell: ({ row }) => row.original.code,
      }),
      columnHelper.display({
        id: "class",
        header: "Equipment Class",
        cell: ({ row }) => row.original.class?.name ?? "—",
      }),
      columnHelper.display({
        id: "productSignalTag",
        header: "Product Signal Tag",
        cell: ({ row }) => row.original.productSignalTag || "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        meta: { headerClassName: "w-24 text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <RowActions
            label={`equipment ${row.original.name}`}
            onEdit={() => openForm(row.original)}
            onDelete={() =>
              onDelete({
                kind: "equipment",
                workUnitId,
                id: row.original.id,
                name: row.original.name,
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
        title="Equipment"
        actionLabel="Add Equipment"
        onAction={() => openForm(null)}
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.id)}
        isPending={isPending}
        isError={isError}
        errorMessage="Failed to load equipment. Please try again."
        emptyMessage="No equipment yet."
        page={page}
        size={size}
        meta={data?.meta}
        onPageChange={setPage}
        onSizeChange={(value) => {
          setSize(value);
          setPage(1);
        }}
      />
      <EquipmentFormDialog open={open} onOpenChange={setOpen} target={target} />
    </>
  );
}

export { EquipmentSection };
