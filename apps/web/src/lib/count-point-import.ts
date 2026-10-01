import { toCsv } from "./csv.js";
import { MAX_IMPORT_ROWS, PointFileError, createPointFileParser } from "./point-import.js";

import type { ImportCountPointRow } from "./types.js";

// The header the file must carry, in the order the template writes it.
const IMPORT_COLUMNS = ["Equipment Code", "Unit Code", "Role", "Source", "Source Tag"] as const;

type ImportColumn = (typeof IMPORT_COLUMNS)[number];

const FIELD_BY_COLUMN: Record<ImportColumn, keyof ImportCountPointRow> = {
  "Equipment Code": "equipmentCode",
  "Unit Code": "unitCode",
  Role: "role",
  Source: "source",
  "Source Tag": "sourceTag",
};

// Kept as its own name so the dialog can tell a file it could not read apart
// from any other failure; the parsing itself is the shared one.
const CountPointFileError = PointFileError;

const parseCountPointFile = createPointFileParser<ImportColumn, ImportCountPointRow>(
  IMPORT_COLUMNS,
  FIELD_BY_COLUMN,
);

function countPointTemplateCsv(): string {
  return toCsv([
    [...IMPORT_COLUMNS],
    ["EQ-FILLER-01", "PCS", "good_output", "plc", "PLC/WC-01/MITSUM-1/Total_Product"],
  ]);
}

export {
  CountPointFileError,
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  countPointTemplateCsv,
  parseCountPointFile,
};
