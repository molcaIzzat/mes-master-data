import { ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils.js";
import { Badge } from "@/components/ui/badge.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

type Option = { id: number; name: string };

type MultiSelectProps = {
  options: Option[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
  invalid?: boolean;
};

// Generic id/name multi-select rendered as a dropdown of checkboxes with the
// current selection shown as removable chips below the trigger.
function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder,
  emptyText,
  disabled,
  invalid,
}: MultiSelectProps) {
  const selected = options.filter((o) => selectedIds.includes(o.id));

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30",
          )}
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
        >
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={selectedIds.includes(option.id)}
                onCheckedChange={() => toggle(option.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {option.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1">
              {item.name}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                className="rounded-sm hover:text-foreground"
                onClick={() => toggle(item.id)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export { MultiSelect };
export type { Option };
