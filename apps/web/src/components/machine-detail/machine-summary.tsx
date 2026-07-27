import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button.js";

import type { WorkCenterDetail, WorkUnitDetail } from "@/lib/types.js";

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

type MachineSummaryProps = {
  workUnit: WorkUnitDetail;
  // Undefined while the line is still loading; the line-level fields fall back
  // to a dash until it lands.
  workCenter: WorkCenterDetail | undefined;
  onEdit: () => void;
};

// Read-only identity of the machine and the line it sits on. Area and Line
// Category are line-level facts, which the work unit itself does not carry.
function MachineSummary({ workUnit, workCenter, onEdit }: MachineSummaryProps) {
  return (
    <div className="flex flex-col gap-6 rounded-md border p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryField label="Area Name" value={workCenter?.area?.name ?? "—"} />
          <SummaryField label="Line Name" value={workUnit.workCenter?.name ?? "—"} />
          <SummaryField label="Line Category" value={workCenter?.class?.name ?? "—"} />
          <SummaryField label="Machine Name" value={workUnit.name} />
          <SummaryField label="Machine Code" value={workUnit.code} />
          <SummaryField label="Machine Category" value={workUnit.class?.name ?? "—"} />
        </div>

        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil />
          Edit Machine
        </Button>
      </div>
    </div>
  );
}

export { MachineSummary };
