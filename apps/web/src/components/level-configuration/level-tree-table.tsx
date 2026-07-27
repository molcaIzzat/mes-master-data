import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.js";

import type { ExpandedState, OnChangeFn, Row } from "@tanstack/react-table";
import type {
  LevelConfigurationListItem,
  LevelEquipmentItem,
  LevelWorkUnitItem,
} from "@/lib/types.js";

// The API returns a nested tree; the table wants uniform rows, so every level
// collapses onto one shape and TanStack walks it via `subRows`. Each row keeps a
// typed reference to its source node (and its parent, where one is needed) so
// the row actions can open a prefilled dialog without another lookup.
type LevelRowKind = "line" | "unit" | "equipment";

type LevelRowBase = {
  rowId: string;
  name: string;
  code: string;
  subRows: LevelRow[];
};

type LevelRow =
  | (LevelRowBase & { kind: "line"; line: LevelConfigurationListItem })
  | (LevelRowBase & { kind: "unit"; line: LevelConfigurationListItem; unit: LevelWorkUnitItem })
  | (LevelRowBase & {
      kind: "equipment";
      unit: LevelWorkUnitItem;
      equipment: LevelEquipmentItem;
    });

type LevelTreeActions = {
  onEditLine: (line: LevelConfigurationListItem) => void;
  onAddMachine: (line: LevelConfigurationListItem) => void;
  onEditMachine: (line: LevelConfigurationListItem, unit: LevelWorkUnitItem) => void;
  onAddEquipment: (unit: LevelWorkUnitItem) => void;
  onEditEquipment: (unit: LevelWorkUnitItem, equipment: LevelEquipmentItem) => void;
  // `childCount` drives the "delete the children first" guard in the dialog.
  onDelete: (target: { kind: LevelRowKind; id: number; name: string; childCount: number }) => void;
};

const INDENT_PER_DEPTH = 20;

// Row tint deepens with the level, matching the reference design.
const ROW_CLASS: Record<LevelRowKind, string> = {
  line: "",
  unit: "bg-muted/30",
  equipment: "bg-muted/60",
};

function toRows(lines: LevelConfigurationListItem[]): LevelRow[] {
  return lines.map((line) => ({
    rowId: `line-${line.id}`,
    kind: "line" as const,
    name: line.name,
    code: line.code,
    line,
    subRows: line.workUnits.map((unit) => ({
      rowId: `unit-${unit.id}`,
      kind: "unit" as const,
      name: unit.name,
      code: unit.code,
      line,
      unit,
      subRows: unit.equipments.map((equipment) => ({
        rowId: `equipment-${equipment.id}`,
        kind: "equipment" as const,
        name: equipment.name,
        code: equipment.code,
        unit,
        equipment,
        subRows: [],
      })),
    })),
  }));
}

type RowActionsProps = {
  row: Row<LevelRow>;
  actions: LevelTreeActions;
};

function RowActions({ row, actions }: RowActionsProps) {
  const item = row.original;

  function handleAdd() {
    if (item.kind === "line") actions.onAddMachine(item.line);
    else if (item.kind === "unit") actions.onAddEquipment(item.unit);
  }

  function handleEdit() {
    if (item.kind === "line") actions.onEditLine(item.line);
    else if (item.kind === "unit") actions.onEditMachine(item.line, item.unit);
    else actions.onEditEquipment(item.unit, item.equipment);
  }

  function handleDelete() {
    const id =
      item.kind === "line" ? item.line.id : item.kind === "unit" ? item.unit.id : item.equipment.id;
    actions.onDelete({
      kind: item.kind,
      id,
      name: item.name,
      childCount: item.subRows.length,
    });
  }

  const addLabel =
    item.kind === "line" ? `Add machine to ${item.name}` : `Add equipment to ${item.name}`;

  return (
    <div className="flex items-center justify-end gap-0.5">
      {item.kind === "equipment" ? null : (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={addLabel}
          onClick={handleAdd}
        >
          <Plus />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Edit ${item.name}`}
        onClick={handleEdit}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-destructive hover:text-destructive"
        aria-label={`Delete ${item.name}`}
        onClick={handleDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

const columnHelper = createColumnHelper<LevelRow>();

// Columns are built in the component so "No" can continue the numbering across
// pages. Area/Category are line-level facts, so child rows leave them blank.
function useColumns(page: number, size: number, actions: LevelTreeActions) {
  return useMemo(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => (row.depth === 0 ? (page - 1) * size + row.index + 1 : null),
      }),
      columnHelper.display({
        id: "area",
        header: "Area",
        cell: ({ row }) =>
          row.original.kind === "line" ? (row.original.line.area?.name ?? "—") : null,
      }),
      columnHelper.display({
        id: "name",
        header: "Line Name",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => (
          <div
            className="flex items-center gap-1"
            style={{ paddingLeft: row.depth * INDENT_PER_DEPTH }}
          >
            {row.getCanExpand() ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={row.getToggleExpandedHandler()}
                aria-expanded={row.getIsExpanded()}
                aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} ${row.original.name}`}
              >
                {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
              </Button>
            ) : (
              // Keeps names aligned on rows that have nothing to expand.
              <span className="size-6 shrink-0" aria-hidden="true" />
            )}
            {row.original.name}
          </div>
        ),
      }),
      // Doubles as Machine Code / Equipment Code on the nested rows.
      columnHelper.accessor("code", { header: "Line Code" }),
      columnHelper.display({
        id: "category",
        header: "Category",
        cell: ({ row }) =>
          row.original.kind === "line" ? (row.original.line.class?.name ?? "—") : null,
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        meta: { headerClassName: "w-32 text-right", cellClassName: "text-right" },
        cell: ({ row }) => <RowActions row={row} actions={actions} />,
      }),
    ],
    [page, size, actions],
  );
}

type LevelTreeTableProps = {
  items: LevelConfigurationListItem[];
  page: number;
  size: number;
  isPending: boolean;
  isError: boolean;
  expanded: ExpandedState;
  onExpandedChange: OnChangeFn<ExpandedState>;
  actions: LevelTreeActions;
};

function LevelTreeTable({
  items,
  page,
  size,
  isPending,
  isError,
  expanded,
  onExpandedChange,
  actions,
}: LevelTreeTableProps) {
  const rows = useMemo(() => toRows(items), [items]);
  const columns = useColumns(page, size, actions);

  const table = useReactTable({
    data: rows,
    columns,
    state: { expanded },
    onExpandedChange,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.rowId,
    manualPagination: true,
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.columnDef.meta?.headerClassName}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array.from({ length: size > 10 ? 10 : size }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((_col, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                Failed to load level configuration. Please try again.
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No lines found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className={ROW_CLASS[row.original.kind]}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { LevelTreeTable };
export type { LevelRow, LevelRowKind, LevelTreeActions };
