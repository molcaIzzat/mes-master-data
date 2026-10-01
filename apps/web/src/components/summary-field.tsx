type SummaryFieldProps = {
  label: string;
  value: string;
};

// One read-only fact: a small muted label over its value. Shared by the line and
// machine summaries and by the DAG editor's toolbar and detail panel, so they all
// read the same.
function SummaryField({ label, value }: SummaryFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export { SummaryField };
