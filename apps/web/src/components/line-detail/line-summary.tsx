import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button.js";

import type { WorkCenterDetail } from "@/lib/types.js";

type SummaryFieldProps = {
  label: string;
  value: string;
};

function SummaryField({ label, value }: SummaryFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

type LineSummaryProps = {
  workCenter: WorkCenterDetail;
  onEdit: () => void;
};

// Read-only identity of the line, with the same shape as the machine page's
// summary one level down.
function LineSummary({ workCenter, onEdit }: LineSummaryProps) {
  return (
    <div className="flex flex-col gap-6 rounded-md border p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryField label="Area Name" value={workCenter.area?.name ?? "—"} />
          <SummaryField label="Line Name" value={workCenter.name} />
          <SummaryField label="Line Category" value={workCenter.class?.name ?? "—"} />
        </div>

        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil />
          Edit Line
        </Button>
      </div>
    </div>
  );
}

export { LineSummary };
