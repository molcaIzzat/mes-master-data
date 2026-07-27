import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";

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
import { TablePagination } from "@/components/table/table-pagination.js";

import type { ColumnDef } from "@tanstack/react-table";
import type { PageMeta } from "@/lib/types.js";

type SectionTableProps<TData> = {
  title: string;
  actionLabel: string;
  onAction: () => void;
  // Display columns only, so one array type covers every section.
  columns: ColumnDef<TData, unknown>[];
  rows: TData[];
  getRowId: (row: TData) => string;
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  emptyMessage: string;
  page: number;
  size: number;
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
};

// One titled, independently paginated section of the machine detail page:
// heading with its add button, the table with its loading/error/empty states,
// and the pager underneath.
function SectionTable<TData>({
  title,
  actionLabel,
  onAction,
  columns,
  rows,
  getRowId,
  isPending,
  isError,
  errorMessage,
  emptyMessage,
  page,
  size,
  meta,
  onPageChange,
  onSizeChange,
}: SectionTableProps<TData>) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <Button size="sm" onClick={onAction}>
          <Plus />
          {actionLabel}
        </Button>
      </div>

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
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
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

      <TablePagination
        page={page}
        size={size}
        meta={meta}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />
    </section>
  );
}

export { SectionTable };
