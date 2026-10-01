import { readSheet } from "read-excel-file/browser";

import { parseCsv } from "./csv.js";

// Count points and other points are imported from the same kind of file and
// judged by the same API contract; only the column set differs. Everything that
// does not depend on the columns lives here, and each point kind supplies its
// own header in a few lines.

// Mirrors MAX_IMPORT_ROWS in the API's work-unit-dto, so an oversized file is
// caught before it is sent rather than bouncing off the validator.
const MAX_IMPORT_ROWS = 1000;

// Raised for a file this app cannot even read as a table. Anything about the
// *values* is the API's call, so it is not decided here.
class PointFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PointFileError";
    Object.setPrototypeOf(this, PointFileError.prototype);
  }
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// Maps each expected column to its position in the file. Order is free -- people
// reorder columns -- but every column has to be there and appear once.
function readHeader<TColumn extends string>(
  header: string[],
  columns: readonly TColumn[],
): Record<TColumn, number> {
  const seen = new Map<string, number>();
  header.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key !== "" && !seen.has(key)) seen.set(key, index);
  });

  const index = {} as Record<TColumn, number>;
  const missing: string[] = [];
  for (const column of columns) {
    const at = seen.get(normalizeHeader(column));
    if (at === undefined) missing.push(column);
    else index[column] = at;
  }

  if (missing.length > 0) {
    const found = header
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(", ");
    throw new PointFileError(
      `The file is missing the ${missing.map((c) => `"${c}"`).join(", ")} ` +
        `${missing.length === 1 ? "column" : "columns"}. ` +
        `It must have: ${columns.join(", ")}. Found: ${found || "nothing"}.`,
    );
  }

  return index;
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
  throw new PointFileError(
    `"${file.name}" is not a supported file. Use a .csv or .xlsx file` +
      (/\.xls$/i.test(file.name) ? " — save the .xls as .xlsx first." : "."),
  );
}

// Structure only: the columns are read and the cells are handed over as text.
// Whether a code exists or a role is spelled right is the API's answer to give,
// so there is one place errors come from.
function createPointFileParser<TColumn extends string, TRow>(
  columns: readonly TColumn[],
  fieldByColumn: Record<TColumn, keyof TRow>,
): (file: File) => Promise<TRow[]> {
  return async function parse(file: File): Promise<TRow[]> {
    const [header, ...body] = await readTable(file);
    if (!header) throw new PointFileError("The file is empty.");

    const index = readHeader(header, columns);

    if (body.length === 0) {
      throw new PointFileError("The file has a header but no rows.");
    }
    if (body.length > MAX_IMPORT_ROWS) {
      throw new PointFileError(
        `The file has ${body.length} rows. At most ${MAX_IMPORT_ROWS} can be imported at once.`,
      );
    }

    return body.map((cells) => {
      const row = {} as TRow;
      for (const column of columns) {
        row[fieldByColumn[column]] = (cells[index[column]] ?? "").trim() as TRow[keyof TRow];
      }
      return row;
    });
  };
}

export { MAX_IMPORT_ROWS, PointFileError, createPointFileParser };
