import { readSheet } from "read-excel-file/browser";

import { parseCsv, toCsv } from "./csv.js";

import type { ImportCountPointRow } from "./types.js";

// The header the file must carry, in the order the template writes it.
const IMPORT_COLUMNS = ["Equipment Code", "Unit Code", "Role", "Source", "Source Tag"] as const;

type ImportColumn = (typeof IMPORT_COLUMNS)[number];

// Mirrors MAX_IMPORT_ROWS in the API's work-unit-dto, so an oversized file is
// caught before it is sent rather than bouncing off the validator.
const MAX_IMPORT_ROWS = 1000;

const FIELD_BY_COLUMN: Record<ImportColumn, keyof ImportCountPointRow> = {
  "Equipment Code": "equipmentCode",
  "Unit Code": "unitCode",
  Role: "role",
  Source: "source",
  "Source Tag": "sourceTag",
};

// Raised for a file this app cannot even read as a table. Anything about the
// *values* is the API's call, so it is not decided here.
class CountPointFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CountPointFileError";
    Object.setPrototypeOf(this, CountPointFileError.prototype);
  }
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// Maps each expected column to its position in the file. Order is free -- people
// reorder columns -- but every column has to be there and appear once.
function readHeader(header: string[]): Record<ImportColumn, number> {
  const seen = new Map<string, number>();
  header.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key !== "" && !seen.has(key)) seen.set(key, index);
  });

  const index = {} as Record<ImportColumn, number>;
  const missing: string[] = [];
  for (const column of IMPORT_COLUMNS) {
    const at = seen.get(normalizeHeader(column));
    if (at === undefined) missing.push(column);
    else index[column] = at;
  }

  if (missing.length > 0) {
    const found = header
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(", ");
    throw new CountPointFileError(
      `The file is missing the ${missing.map((c) => `"${c}"`).join(", ")} ` +
        `${missing.length === 1 ? "column" : "columns"}. ` +
        `It must have: ${IMPORT_COLUMNS.join(", ")}. Found: ${found || "nothing"}.`,
    );
  }

  return index;
}

function toRows(table: string[][]): ImportCountPointRow[] {
  const [header, ...body] = table;
  if (!header) throw new CountPointFileError("The file is empty.");

  const index = readHeader(header);

  if (body.length === 0) {
    throw new CountPointFileError("The file has a header but no rows.");
  }
  if (body.length > MAX_IMPORT_ROWS) {
    throw new CountPointFileError(
      `The file has ${body.length} rows. At most ${MAX_IMPORT_ROWS} can be imported at once.`,
    );
  }

  return body.map((cells) => {
    const row = {} as ImportCountPointRow;
    for (const column of IMPORT_COLUMNS) {
      row[FIELD_BY_COLUMN[column]] = (cells[index[column]] ?? "").trim();
    }
    return row;
  });
}

// Excel hands back typed cells -- a numeric code comes through as a number and a
// blank as null -- so everything is flattened to text before the shared reader.
function cellToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  // Anything else (a formula object, an image) reads as blank, which the API
  // then reports as the missing value it is.
  return "";
}

async function readTable(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name)) {
    return parseCsv(await file.text());
  }
  if (/\.xlsx$/i.test(file.name)) {
    // The first sheet only -- the template is one sheet, and guessing among
    // several would be worse than saying nothing.
    const sheet = await readSheet(file);
    return sheet
      .map((cells) => cells.map(cellToText))
      .filter((cells) => cells.some((cell) => cell.trim() !== ""));
  }
  // The legacy binary .xls is not readable in the browser; Excel's own
  // "Save As" offers .xlsx, so say that rather than fail cryptically later.
  throw new CountPointFileError(
    `"${file.name}" is not a supported file. Use a .csv or .xlsx file` +
      (/\.xls$/i.test(file.name) ? " — save the .xls as .xlsx first." : "."),
  );
}

// Structure only: the columns are read and the cells are handed over as text.
// Whether a code exists or a role is spelled right is the API's answer to give,
// so there is one place errors come from.
async function parseCountPointFile(file: File): Promise<ImportCountPointRow[]> {
  return toRows(await readTable(file));
}

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
