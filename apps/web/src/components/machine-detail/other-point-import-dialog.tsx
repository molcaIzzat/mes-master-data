import { useImportOtherPoints } from "@/lib/queries.js";
import {
  IMPORT_COLUMNS,
  otherPointTemplateCsv,
  parseOtherPointFile,
} from "@/lib/other-point-import.js";
import { PointImportDialog } from "@/components/machine-detail/point-import-dialog.js";

import type { ImportOtherPointRow } from "@/lib/types.js";

const TEMPLATE_FILENAME = "other-points-template.csv";

type OtherPointImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workUnitId: number;
};

function OtherPointImportDialog({ open, onOpenChange, workUnitId }: OtherPointImportDialogProps) {
  const importPoints = useImportOtherPoints();

  return (
    <PointImportDialog<ImportOtherPointRow>
      open={open}
      onOpenChange={onOpenChange}
      workUnitId={workUnitId}
      title="Import Other Points"
      columns={IMPORT_COLUMNS}
      templateFilename={TEMPLATE_FILENAME}
      templateCsv={otherPointTemplateCsv}
      parseFile={parseOtherPointFile}
      importMutation={importPoints}
    />
  );
}

export { OtherPointImportDialog };
