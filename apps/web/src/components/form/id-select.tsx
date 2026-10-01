import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";

type IdOption = {
  id: number;
  label: string;
};

type IdSelectProps = {
  options: IdOption[] | undefined;
  value: number | null;
  onChange: (value: number) => void;
  placeholder: string;
  disabled?: boolean;
  // Shown in place of the options while there are none to choose from, e.g.
  // before a product has been picked.
  emptyMessage?: string;
};

// Select over rows identified by a numeric id. Unlike ClassSelect there is no
// "None" entry: every field using this one is required.
function IdSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  emptyMessage = "No options available",
}: IdSelectProps) {
  const items = options ?? [];

  return (
    // Radix reads "" as "nothing selected" and falls back to the placeholder;
    // `undefined` would instead flip the select to uncontrolled and leave a
    // stale label behind when the field is cleared.
    <Select
      value={value != null ? String(value) : ""}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          items.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export { IdSelect };
export type { IdOption };
