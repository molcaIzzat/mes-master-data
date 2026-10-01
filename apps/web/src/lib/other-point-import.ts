import { toCsv } from "./csv.js";
import { MAX_IMPORT_ROWS, PointFileError, createPointFileParser } from "./point-import.js";

import type { ImportOtherPointRow } from "./types.js";

// The header the file must carry, in the order the template writes it. There is
// no Unit and no Source: a reason tag is always read off the PLC, and it counts
// occurrences rather than product.
const IMPORT_COLUMNS = ["Equipment Code", "Role", "Data Type", "Source Tag"] as const;

type ImportColumn = (typeof IMPORT_COLUMNS)[number];

const FIELD_BY_COLUMN: Record<ImportColumn, keyof ImportOtherPointRow> = {
  "Equipment Code": "equipmentCode",
  Role: "role",
  "Data Type": "dataType",
  "Source Tag": "sourceTag",
};

// Kept as its own name so the dialog can tell a file it could not read apart
// from any other failure; the parsing itself is the shared one.
const OtherPointFileError = PointFileError;

const parseOtherPointFile = createPointFileParser<ImportColumn, ImportOtherPointRow>(
  IMPORT_COLUMNS,
  FIELD_BY_COLUMN,
);

function otherPointTemplateCsv(): string {
  return toCsv([
    [...IMPORT_COLUMNS],
    ["EQ-FILLER-01", "downtime", "boolean", "PLC/FI2-L1/MITSUM-1/Machine_Stop"],
    ["EQ-FILLER-01", "reject", "uint16", "PLC/FI2-L1/MITSUM-1/Film_Joint"],
  ]);
}

export {
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  OtherPointFileError,
  otherPointTemplateCsv,
  parseOtherPointFile,
};
