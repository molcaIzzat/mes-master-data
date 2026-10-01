import { useImportCountPoints } from "@/lib/queries.js";
import {
  IMPORT_COLUMNS,
  countPointTemplateCsv,
  parseCountPointFile,
} from "@/lib/count-point-import.js";
import { PointImportDialog } from "@/components/machine-detail/point-import-dialog.js";

import type { ImportCountPointRow } from "@/lib/types.js";

const TEMPLATE_FILENAME = "count-points-template.csv";

type CountPointImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workUnitId: number;
};

function CountPointImportDialog({ open, onOpenChange, workUnitId }: CountPointImportDialogProps) {
  const importPoints = useImportCountPoints();

  return (
    <PointImportDialog<ImportCountPointRow>
      open={open}
      onOpenChange={onOpenChange}
      workUnitId={workUnitId}
      title="Import Count Points"
      columns={IMPORT_COLUMNS}
      templateFilename={TEMPLATE_FILENAME}
      templateCsv={countPointTemplateCsv}
      parseFile={parseCountPointFile}
      importMutation={importPoints}
    />
  );
}

export { CountPointImportDialog };
