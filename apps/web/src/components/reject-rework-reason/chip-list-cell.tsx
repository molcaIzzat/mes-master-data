import { Badge } from "@/components/ui/badge.js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.js";

import type { RejectReworkReasonRef } from "@/lib/types.js";

// How many chips to show inline before collapsing the rest behind a "+N" badge.
const MAX_VISIBLE = 2;

// Renders a list of related items (lines / equipments) as badges: the first
// MAX_VISIBLE inline, then a clickable "+N" badge that opens a popover listing
// every item.
function ChipListCell({ items, label }: { items: RejectReworkReasonRef[]; label: string }) {
  if (items.length === 0) return <span className="text-muted-foreground">-</span>;

  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.slice(MAX_VISIBLE);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((item) => (
        <Badge key={item.id} variant="secondary">
          {item.name}
        </Badge>
      ))}
      {overflow.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/70"
              role="button"
              aria-label={`Show all ${items.length} ${label}`}
            >
              +{overflow.length}
            </Badge>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="mb-2 text-sm font-medium">
              {label} ({items.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {items.map((item) => (
                <Badge key={item.id} variant="secondary">
                  {item.name}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export { ChipListCell };
