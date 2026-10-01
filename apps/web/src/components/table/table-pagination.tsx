import { ChevronLeft, ChevronRight } from "lucide-react";

import { pageWindow } from "@/lib/table.js";
import { Button } from "@/components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";

import type { PageMeta } from "@/lib/types.js";

// The API caps a page at 100 rows.
const PAGE_SIZES = [10, 25, 50, 100] as const;

type TablePaginationProps = {
  page: number;
  size: number;
  // Undefined until the first response lands; the pager then falls back to
  // "one page, nothing to step through".
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
};

// Page-size select on the left, compact pager on the right -- the footer every
// server-paginated table on the app shares.
function TablePagination({ page, size, meta, onPageChange, onSizeChange }: TablePaginationProps) {
  const totalPages = meta?.totalPages ?? 0;
  const isFirst = meta?.first ?? page <= 1;
  const isLast = meta?.last ?? true;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
        <SelectTrigger size="sm" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((pageSize) => (
            <SelectItem key={pageSize} value={String(pageSize)}>
              {pageSize}
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
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft />
        </Button>
        {pageWindow(page, totalPages).map((pageNumber, i) =>
          pageNumber === 0 ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={pageNumber}
              variant={pageNumber === page ? "default" : "outline"}
              size="icon"
              className="size-8"
              aria-current={pageNumber === page ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
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
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export { PAGE_SIZES, TablePagination };
