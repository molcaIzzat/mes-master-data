import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ClassValue } from "clsx";
import type { EquipmentListItem } from "./types.js";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Equipment option label: "unit.name - name (code)", or "name (code)" when the
// equipment has no work unit.
function formatEquipmentLabel(equipment: EquipmentListItem): string {
  return equipment.unit
    ? `${equipment.unit.name} - ${equipment.name} (${equipment.code})`
    : `${equipment.name} (${equipment.code})`;
}

export { cn, formatEquipmentLabel };
