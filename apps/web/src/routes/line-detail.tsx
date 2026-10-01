import { useCallback, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";

import { useWorkCenter } from "@/lib/queries.js";
import { Button } from "@/components/ui/button.js";
import { FullPageLoader } from "@/components/full-page-loader.js";
import { LineFormDialog } from "@/components/level-configuration/line-form-dialog.js";
import { DeleteFlowDialog } from "@/components/line-detail/delete-flow-dialog.js";
import { LineSummary } from "@/components/line-detail/line-summary.js";
import { MachineFlowSection } from "@/components/line-detail/machine-flow-section.js";

import type { DeleteFlowTarget } from "@/components/line-detail/delete-flow-dialog.js";

function LineDetail() {
  const { id } = useParams({ strict: false });
  const workCenterId = Number(id);

  const [lineOpen, setLineOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteFlowTarget | null>(null);

  const { data: workCenter, isPending, isError } = useWorkCenter(workCenterId);

  const handleDelete = useCallback((target: DeleteFlowTarget) => {
    setDeleteTarget(target);
  }, []);

  if (!Number.isFinite(workCenterId) || isError || (!isPending && !workCenter)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">Line not found.</p>
        <Button asChild variant="outline">
          <Link to="/level-configuration">Back to Level Configuration</Link>
        </Button>
      </div>
    );
  }

  if (isPending || !workCenter) return <FullPageLoader />;

  return (
    <div className="flex flex-col gap-6">
      <LineSummary workCenter={workCenter} onEdit={() => setLineOpen(true)} />

      <MachineFlowSection workCenterId={workCenterId} onDelete={handleDelete} />

      {/* The line dialog prefills from area/name/code/class only, so the tree's
          `workUnits` can be left empty. */}
      <LineFormDialog
        open={lineOpen}
        onOpenChange={setLineOpen}
        item={{ ...workCenter, workUnits: [] }}
      />
      <DeleteFlowDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export { LineDetail };
