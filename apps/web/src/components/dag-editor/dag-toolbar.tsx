import { Link } from "@tanstack/react-router";
import { Cable, ChevronLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { Separator } from "@/components/ui/separator.js";
import { SummaryField } from "@/components/summary-field.js";

import type { WorkCenterDetail } from "@/lib/types.js";

type DagToolbarProps = {
  workCenter: WorkCenterDetail;
  connectMode: boolean;
  onToggleConnectMode: () => void;
  onAddMachine: () => void;
};

// The editor's own header: the way back to the line, which line this is, and the
// two things that can be added to the canvas.
function DagToolbar({
  workCenter,
  connectMode,
  onToggleConnectMode,
  onAddMachine,
}: DagToolbarProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-4 border-b px-4 py-3">
      <Button asChild variant="ghost" size="sm">
        <Link to="/level-configuration/line/$id" params={{ id: String(workCenter.id) }}>
          <ChevronLeft />
          Back to Line
        </Link>
      </Button>

      <Separator orientation="vertical" className="hidden h-10 sm:block" />

      <div className="flex flex-1 flex-wrap items-center gap-6">
        <SummaryField label="Line Code" value={workCenter.code} />
        <SummaryField label="Line Name" value={workCenter.name} />
        <SummaryField label="Category" value={workCenter.class?.name ?? "—"} />
      </div>

      <div className="flex items-center gap-2">
        {/* A toggle rather than a dialog: flows are drawn between machines, and
            the pressed state is what tells the user a drag now means "connect". */}
        <Button
          variant={connectMode ? "default" : "outline"}
          size="sm"
          aria-pressed={connectMode}
          onClick={onToggleConnectMode}
        >
          <Cable />
          Connector
        </Button>

        <Button variant="outline" size="sm" onClick={onAddMachine}>
          <Plus />
          Machine
        </Button>
      </div>
    </header>
  );
}

export { DagToolbar };
