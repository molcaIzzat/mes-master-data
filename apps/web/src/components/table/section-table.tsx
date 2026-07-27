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

import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PageMeta } from "@/lib/types.js";

// Server-side paging state. Omitted by sections whose endpoint returns
// everything at once, which then render no pager.
type SectionPagination = {
  page: number;
  size: number;
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
};

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
  // Rendered to the left of the add button, for sections that offer more than
  // one way in.
  headerActions?: ReactNode;
  pagination?: SectionPagination;
};

// One titled section of a detail page: heading with its add button, the table
// with its loading/error/empty states, and the pager underneath when the
// section is paginated.
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
  headerActions,
  pagination,
}: SectionTableProps<TData>) {
  // Skeleton rows stand in for a page of data; unpaginated sections get a few.
  const skeletonRows = Math.min(pagination?.size ?? 3, 10);
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
        <div className="flex items-center gap-2">
          {headerActions}
          <Button size="sm" onClick={onAction}>
            <Plus />
            {actionLabel}
          </Button>
        </div>
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
              Array.from({ length: skeletonRows }).map((_, i) => (
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

      {pagination && (
        <TablePagination
          page={pagination.page}
          size={pagination.size}
          meta={pagination.meta}
          onPageChange={pagination.onPageChange}
          onSizeChange={pagination.onSizeChange}
        />
      )}
    </section>
  );
}

export { SectionTable };
export type { SectionPagination };
