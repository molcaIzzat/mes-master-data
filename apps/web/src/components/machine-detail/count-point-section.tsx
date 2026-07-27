import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { useCountPoints } from "@/lib/queries.js";
import { COUNT_ROLE_LABELS, COUNT_SOURCE_LABELS } from "@/lib/machine-detail-schema.js";
import { PAGE_SIZES } from "@/components/table/table-pagination.js";
import { CountPointFormDialog } from "@/components/machine-detail/count-point-form-dialog.js";
import { RowActions } from "@/components/table/row-actions.js";
import { SectionTable } from "@/components/table/section-table.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { CountPointTarget } from "@/components/machine-detail/count-point-form-dialog.js";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { CountPointListItem } from "@/lib/types.js";

const columnHelper = createColumnHelper<CountPointListItem>();
const EMPTY: CountPointListItem[] = [];

type CountPointSectionProps = {
  workUnitId: number;
  onDelete: (target: DeleteMachineChildTarget) => void;
};

// Where this machine's counts come from: which equipment reports what, in which
// unit, off which PLC tag.
function CountPointSection({ workUnitId, onDelete }: CountPointSectionProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<CountPointTarget | null>(null);

  const { data, isPending, isError } = useCountPoints({ workUnitId, page, size });
  const rows = data?.items ?? EMPTY;

  const openForm = useCallback(
    (item: CountPointListItem | null) => {
      setTarget({ workUnitId, item });
      setOpen(true);
    },
    [workUnitId],
  );

  const columns = useMemo<ColumnDef<CountPointListItem, unknown>[]>(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => (page - 1) * size + row.index + 1,
      }),
      columnHelper.display({
        id: "equipmentName",
        header: "Equipment Name",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => row.original.equipment?.name ?? "—",
      }),
      columnHelper.display({
        id: "equipmentCode",
        header: "Equipment Code",
        cell: ({ row }) => row.original.equipment?.code ?? "—",
      }),
      columnHelper.display({
        id: "unit",
        header: "Unit",
        cell: ({ row }) => row.original.uom?.code ?? "—",
      }),
      columnHelper.display({
        id: "role",
        header: "Role",
        cell: ({ row }) => COUNT_ROLE_LABELS[row.original.role],
      }),
      columnHelper.display({
        id: "source",
        header: "Source",
        cell: ({ row }) => COUNT_SOURCE_LABELS[row.original.source],
      }),
      columnHelper.display({
        id: "sourceTag",
        header: "Source Tag",
        meta: { cellClassName: "font-mono text-xs" },
        cell: ({ row }) => row.original.sourceTag,
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        meta: { headerClassName: "w-24 text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <RowActions
            label={`count point ${row.original.sourceTag}`}
            onEdit={() => openForm(row.original)}
            onDelete={() =>
              onDelete({
                kind: "count point",
                workUnitId,
                id: row.original.id,
                name: row.original.sourceTag,
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
        title="Count Point"
        actionLabel="Add Point"
        onAction={() => openForm(null)}
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.id)}
        isPending={isPending}
        isError={isError}
        errorMessage="Failed to load count points. Please try again."
        emptyMessage="No count points yet."
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
      <CountPointFormDialog open={open} onOpenChange={setOpen} target={target} />
    </>
  );
}

export { CountPointSection };
