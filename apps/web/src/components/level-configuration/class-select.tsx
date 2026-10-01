import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";

import type { ClassListItem } from "@/lib/types.js";

// Radix Select cannot hold an empty string, so the cleared state gets a sentinel.
const NO_CLASS = "none";

type ClassSelectProps = {
  options: ClassListItem[] | undefined;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
};

// The class/category selects on all three levels are optional, so each one
// carries an explicit "None" entry to clear it again.
function ClassSelect({ options, value, onChange, placeholder }: ClassSelectProps) {
  return (
    <Select
      value={value != null ? String(value) : NO_CLASS}
      onValueChange={(v) => onChange(v === NO_CLASS ? null : Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CLASS}>None</SelectItem>
        {options?.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { ClassSelect };
