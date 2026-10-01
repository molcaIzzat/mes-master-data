import type { RowData } from "@tanstack/react-table";

// Per-column class hints, read back when rendering header/body cells.
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

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

export { pageWindow };
