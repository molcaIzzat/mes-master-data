import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils.js";

import type { EquipmentListItem } from "@/lib/types.js";

type EquipmentCardProps = {
  equipment: EquipmentListItem;
  onSelect: () => void;
  // Set when the card sits inside a canvas node: `nodrag` keeps a click on the
  // card from turning into a drag of the whole machine.
  insideNode?: boolean;
};

// One piece of equipment, as it reads on a machine node and in the detail panel:
// name above code, chevron to drill in.
function EquipmentCard({ equipment, onSelect, insideNode = false }: EquipmentCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent",
        insideNode && "nodrag",
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-muted-foreground">{equipment.name}</span>
        <span className="truncate text-sm font-medium">{equipment.code}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export { EquipmentCard };
