import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { useAreas, useDowntimeReasons } from "@/lib/queries.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.js";
import { ChipListCell } from "@/components/downtime-reason/chip-list-cell.js";
import { DeleteDowntimeReasonDialog } from "@/components/downtime-reason/delete-downtime-reason-dialog.js";
import { DowntimeReasonFormDialog } from "@/components/downtime-reason/downtime-reason-form-dialog.js";

import type { DeleteTarget } from "@/components/downtime-reason/delete-downtime-reason-dialog.js";
import type { DowntimeReasonCategory, DowntimeReasonListItem } from "@/lib/types.js";
import type { RowData } from "@tanstack/react-table";

// Per-column class hints, read back when rendering header/body cells.
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

const PAGE_SIZES = [10, 25, 50, 100] as const;
const ALL_AREAS = "all";
const ALL_CATEGORIES = "all";
const CATEGORIES: DowntimeReasonCategory[] = ["PLANNED", "UNPLANNED", "SMALL_STOP"];
const EMPTY: DowntimeReasonListItem[] = [];

// Compact page list: always shows first/last and a window around the current
// page, inserting an ellipsis marker (0) where pages are skipped.
function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: number[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push(0); // ellipsis marker
    result.push(p);
    prev = p;
  }
  return result;
}

type RowActionsProps = {
  item: DowntimeReasonListItem;
  onEdit: (item: DowntimeReasonListItem) => void;
  onDelete: (target: DeleteTarget) => void;
};

function RowActions({ item, onEdit, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Row actions">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onSelect={() => onEdit(item)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete({ id: item.id, name: item.name })}
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columnHelper = createColumnHelper<DowntimeReasonListItem>();

// Columns are built inside the component so the "No" cell can compute a
// continuous row number from the current page/size and the actions cell can
// reach the edit/delete handlers.
function useColumns(
  page: number,
  size: number,
  onEdit: (item: DowntimeReasonListItem) => void,
  onDelete: (target: DeleteTarget) => void,
) {
  return useMemo(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
        cell: ({ row }) => (page - 1) * size + row.index + 1,
      }),
      columnHelper.accessor("name", {
        header: "Downtime Reason",
        meta: { cellClassName: "font-medium" },
      }),
      columnHelper.accessor("code", { header: "Code" }),
      columnHelper.accessor("category", { header: "Downtime Category" }),
      columnHelper.display({
        id: "area",
        header: "Area",
        cell: ({ row }) => <ChipListCell items={row.original.areas} label="Areas" />,
      }),
      columnHelper.display({
        id: "line",
        header: "Line",
        cell: ({ row }) => <ChipListCell items={row.original.workCenters} label="Lines" />,
      }),
      columnHelper.display({
        id: "equipments",
        header: "Equipments",
        cell: ({ row }) => <ChipListCell items={row.original.equipments} label="Equipments" />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: { headerClassName: "w-16 text-right", cellClassName: "text-right" },
        cell: ({ row }) => <RowActions item={row.original} onEdit={onEdit} onDelete={onDelete} />,
      }),
    ],
    [page, size, onEdit, onDelete],
  );
}

function DowntimeReason() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState<DowntimeReasonCategory | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // null while adding; the target row while editing.
  const [formItem, setFormItem] = useState<DowntimeReasonListItem | null>(null);

  // Debounce the search box before it hits the query; reset to page 1 on change.
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: areas } = useAreas();
  const { data, isPending, isError } = useDowntimeReasons({ page, size, q, category, areaId });

  const items = data?.items ?? EMPTY;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 0;
  const isFirst = meta?.first ?? page <= 1;
  const isLast = meta?.last ?? true;

  const openAdd = useCallback(() => {
    setFormItem(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((item: DowntimeReasonListItem) => {
    setFormItem(item);
    setFormOpen(true);
  }, []);

  const columns = useColumns(page, size, openEdit, setDeleteTarget);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    manualPagination: true,
  });

  function handleAreaChange(value: string) {
    setAreaId(value === ALL_AREAS ? undefined : Number(value));
    setPage(1);
  }

  function handleCategoryChange(value: string) {
    setCategory(value === ALL_CATEGORIES ? undefined : (value as DowntimeReasonCategory));
    setPage(1);
  }

  function handleSizeChange(value: string) {
    setSize(Number(value));
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={areaId ? String(areaId) : ALL_AREAS} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AREAS}>All Areas</SelectItem>
              {areas?.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category ?? ALL_CATEGORIES} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All Category</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="pl-9"
            />
          </div>
        </div>

        <Button className="w-full sm:w-auto" onClick={openAdd}>
          <Plus />
          Add Reason
        </Button>
      </div>

      {/* Table */}
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
                  Failed to load downtime reasons. Please try again.
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No downtime reasons found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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

      {/* Footer: page size + pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={String(size)} onValueChange={handleSizeChange}>
          <SelectTrigger size="sm" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Previous page"
            disabled={isFirst}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft />
          </Button>
          {pageWindow(page, totalPages).map((pageNumber, i) =>
            pageNumber === 0 ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1 text-sm text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <Button
                key={pageNumber}
                variant={pageNumber === page ? "default" : "outline"}
                size="icon"
                className="size-8"
                aria-current={pageNumber === page ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Next page"
            disabled={isLast}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <DowntimeReasonFormDialog open={formOpen} onOpenChange={setFormOpen} item={formItem} />
      <DeleteDowntimeReasonDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export { DowntimeReason };
