import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { useEdges } from "@/lib/queries.js";
import { RowActions } from "@/components/table/row-actions.js";
import { SectionTable } from "@/components/table/section-table.js";
import { FlowFormDialog } from "@/components/line-detail/flow-form-dialog.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { DeleteFlowTarget } from "@/components/line-detail/delete-flow-dialog.js";
import type { FlowTarget } from "@/components/line-detail/flow-form-dialog.js";
import type { EdgeListItem } from "@/lib/types.js";

const columnHelper = createColumnHelper<EdgeListItem>();
const EMPTY: EdgeListItem[] = [];

// Names the flow in confirmations and screen-reader labels.
function flowLabel(edge: EdgeListItem): string {
  return `${edge.from?.name ?? "?"} → ${edge.to?.name ?? "?"}`;
}

type MachineFlowSectionProps = {
  workCenterId: number;
  onDelete: (target: DeleteFlowTarget) => void;
};

// Which machine feeds which on this line. The endpoint returns every flow at
// once, so this section has no pager.
function MachineFlowSection({ workCenterId, onDelete }: MachineFlowSectionProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<FlowTarget | null>(null);

  const { data, isPending, isError } = useEdges(workCenterId);
  const rows = data ?? EMPTY;

  const openForm = useCallback(
    (item: EdgeListItem | null) => {
      setTarget({ workCenterId, item });
      setOpen(true);
    },
    [workCenterId],
  );

  const columns = useMemo<ColumnDef<EdgeListItem, unknown>[]>(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => row.index + 1,
      }),
      columnHelper.display({
        id: "fromName",
        header: "From Machine Name",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => row.original.from?.name ?? "—",
      }),
      columnHelper.display({
        id: "fromCode",
        header: "From Machine Code",
        cell: ({ row }) => row.original.from?.code ?? "—",
      }),
      columnHelper.display({
        id: "toName",
        header: "To Machine Name",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => row.original.to?.name ?? "—",
      }),
      columnHelper.display({
        id: "toCode",
        header: "To Machine Code",
        cell: ({ row }) => row.original.to?.code ?? "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        meta: { headerClassName: "w-24 text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <RowActions
            label={`flow ${flowLabel(row.original)}`}
            onEdit={() => openForm(row.original)}
            onDelete={() =>
              onDelete({
                workCenterId,
                id: row.original.id,
                label: flowLabel(row.original),
              })
            }
          />
        ),
      }),
    ],
    [workCenterId, onDelete, openForm],
  );

  return (
    <>
      <SectionTable
        title="Machine Flow"
        actionLabel="Add Flow"
        onAction={() => openForm(null)}
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.id)}
        isPending={isPending}
        isError={isError}
        errorMessage="Failed to load machine flows. Please try again."
        emptyMessage="No machine flows yet."
      />
      <FlowFormDialog open={open} onOpenChange={setOpen} target={target} />
    </>
  );
}

export { MachineFlowSection };
