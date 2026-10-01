import { Pencil, Workflow } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button.js";
import { SummaryField } from "@/components/summary-field.js";

import type { WorkCenterDetail } from "@/lib/types.js";

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

        <div className="flex shrink-0 items-center gap-2">
          {/* The same flows the table below lists, on a canvas. */}
          <Button asChild variant="outline" size="sm">
            <Link
              to="/level-configuration/line/$id/dag-editor"
              params={{ id: String(workCenter.id) }}
            >
              <Workflow />
              DAG Editor
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Edit Line
          </Button>
        </div>
      </div>
    </div>
  );
}

export { LineSummary };
