import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Upload } from "lucide-react";

import { useOtherPoints } from "@/lib/queries.js";
import { OTHER_DATA_TYPE_LABELS, OTHER_ROLE_LABELS } from "@/lib/machine-detail-schema.js";
import { PAGE_SIZES } from "@/components/table/table-pagination.js";
import { Button } from "@/components/ui/button.js";
import { OtherPointFormDialog } from "@/components/machine-detail/other-point-form-dialog.js";
import { OtherPointImportDialog } from "@/components/machine-detail/other-point-import-dialog.js";
import { RowActions } from "@/components/table/row-actions.js";
import { SectionTable } from "@/components/table/section-table.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { OtherPointTarget } from "@/components/machine-detail/other-point-form-dialog.js";
import type { DeleteMachineChildTarget } from "@/components/machine-detail/delete-machine-child-dialog.js";
import type { OtherPointListItem } from "@/lib/types.js";

const columnHelper = createColumnHelper<OtherPointListItem>();
const EMPTY: OtherPointListItem[] = [];

type OtherPointSectionProps = {
  workUnitId: number;
  onDelete: (target: DeleteMachineChildTarget) => void;
};

// Why this machine stops, and why it rejects: which equipment raises which
// reason, off which PLC tag and at what width. The ETL reads these to attribute
// a stop or a scrapped unit to the signal behind it.
function OtherPointSection({ workUnitId, onDelete }: OtherPointSectionProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [target, setTarget] = useState<OtherPointTarget | null>(null);

  const { data, isPending, isError } = useOtherPoints({ workUnitId, page, size });
  const rows = data?.items ?? EMPTY;

  const openForm = useCallback(
    (item: OtherPointListItem | null) => {
      setTarget({ workUnitId, item });
      setOpen(true);
    },
    [workUnitId],
  );

  const columns = useMemo<ColumnDef<OtherPointListItem, unknown>[]>(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => (page - 1) * size + row.index + 1,
      }),
      columnHelper.display({
        id: "equipmentCode",
        header: "Equipment Code",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => row.original.equipment?.code ?? "—",
      }),
      columnHelper.display({
        id: "role",
        header: "Role",
        cell: ({ row }) => OTHER_ROLE_LABELS[row.original.role],
      }),
      columnHelper.display({
        id: "dataType",
        header: "Data Type",
        cell: ({ row }) => OTHER_DATA_TYPE_LABELS[row.original.dataType],
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
            label={`other point ${row.original.sourceTag}`}
            onEdit={() => openForm(row.original)}
            onDelete={() =>
              onDelete({
                kind: "other point",
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
        title="Other Point"
        actionLabel="Add Point"
        onAction={() => openForm(null)}
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.id)}
        isPending={isPending}
        isError={isError}
        errorMessage="Failed to load other points. Please try again."
        emptyMessage="No downtime or reject reason tags yet."
        headerActions={
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload />
            Import
          </Button>
        }
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
      <OtherPointFormDialog open={open} onOpenChange={setOpen} target={target} />
      <OtherPointImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workUnitId={workUnitId}
      />
    </>
  );
}

export { OtherPointSection };
