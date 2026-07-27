import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";

type EnumSelectProps = {
  // The enum's members in display order, paired with their labels.
  options: readonly string[];
  labels: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

// Select over a string enum. Form state starts as "", which Radix reads as
// "nothing selected" and renders as the placeholder.
function EnumSelect({ options, labels, value, onChange, placeholder }: EnumSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option] ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { EnumSelect };
