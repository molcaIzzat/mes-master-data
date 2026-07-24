import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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

import { useAreas, useProducts } from "@/lib/queries.js";
import { Badge } from "@/components/ui/badge.js";
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
import { DeleteSkuDialog } from "@/components/sku/delete-sku-dialog.js";
import { SkuDetailSheet } from "@/components/sku/sku-detail-sheet.js";

import type { DeleteTarget } from "@/components/sku/delete-sku-dialog.js";
import type { ProductLine, ProductListItem } from "@/lib/types.js";
import type { RowData } from "@tanstack/react-table";

// Table meta carries the current page/size so the "No" column can compute a
// continuous row number across server-paginated pages.
declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    page: number;
    size: number;
    openView: (id: number) => void;
    openDelete: (target: DeleteTarget) => void;
  }
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

const PAGE_SIZES = [10, 25, 50, 100] as const;
const ALL_AREAS = "all";
// How many line chips to show before collapsing the rest into a "+N" badge.
const MAX_VISIBLE_LINES = 2;
const EMPTY: ProductListItem[] = [];

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

function LineCell({ lines }: { lines: ProductLine[] }) {
  if (lines.length === 0) return <span className="text-muted-foreground">-</span>;

  const visible = lines.slice(0, MAX_VISIBLE_LINES);
  const overflow = lines.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((line) => (
        <Badge key={line.id} variant="secondary">
          {line.name}
        </Badge>
      ))}
      {overflow > 0 && <Badge variant="secondary">+{overflow}</Badge>}
    </div>
  );
}

type RowActionsProps = {
  id: number;
  name: string;
  onView: (id: number) => void;
  onDelete: (target: DeleteTarget) => void;
};

function RowActions({ id, name, onView, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Row actions">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onSelect={() => onView(id)}>
          <Search />
          View
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/sku/$id/edit" params={{ id: String(id) }}>
            <Pencil />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete({ id, name })}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columnHelper = createColumnHelper<ProductListItem>();

const columns = [
  columnHelper.display({
    id: "no",
    header: "No",
    meta: { headerClassName: "w-16", cellClassName: "text-muted-foreground" },
    cell: ({ row, table }) => {
      const { page, size } = table.options.meta!;
      return (page - 1) * size + row.index + 1;
    },
  }),
  columnHelper.accessor("code", {
    header: "SKU Code",
    meta: { cellClassName: "font-medium" },
  }),
  columnHelper.accessor("name", { header: "SKU Name" }),
  columnHelper.accessor((row) => row.area?.name ?? "-", {
    id: "area",
    header: "Area",
  }),
  columnHelper.display({
    id: "line",
    header: "Line",
    cell: ({ row }) => <LineCell lines={row.original.workCenters} />,
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    meta: { headerClassName: "w-16 text-right", cellClassName: "text-right" },
    cell: ({ row, table }) => (
      <RowActions
        id={row.original.id}
        name={row.original.name}
        onView={table.options.meta!.openView}
        onDelete={table.options.meta!.openDelete}
      />
    ),
  }),
];

function Sku() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState<number | undefined>(undefined);
  const [viewId, setViewId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Debounce the search box before it hits the query; reset to page 1 on change.
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: areas } = useAreas();
  const { data, isPending, isError } = useProducts({ page, size, q, areaId });

  const items = data?.items ?? EMPTY;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 0;
  const isFirst = meta?.first ?? page <= 1;
  const isLast = meta?.last ?? true;

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    manualPagination: true,
    meta: { page, size, openView: setViewId, openDelete: setDeleteTarget },
  });

  function handleAreaChange(value: string) {
    setAreaId(value === ALL_AREAS ? undefined : Number(value));
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

        <Button asChild className="w-full sm:w-auto">
          <Link to="/sku/add">
            <Plus />
            Add SKU
          </Link>
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
                  Failed to load SKUs. Please try again.
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No SKUs found.
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

      <SkuDetailSheet
        productId={viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        onEdit={(id) => {
          setViewId(null);
          void navigate({ to: "/sku/$id/edit", params: { id: String(id) } });
        }}
        onDelete={(target) => {
          setViewId(null);
          setDeleteTarget(target);
        }}
      />
      <DeleteSkuDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export { Sku };
