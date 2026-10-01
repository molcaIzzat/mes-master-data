import type { ImportCountPointIssue } from "./count-point.js";

class InvalidCountPointferenceError extends Error {
  public readonly columnName?: string;
  public readonly targetId?: string;

  constructor(columnName?: string, targetId?: string) {
    super(
      columnName && targetId
        ? `"${columnName}" with value "${targetId}" does not exist`
        : "references does not exist",
    );
    this.name = "InvalidCountPointferenceError";
    this.columnName = columnName;
    this.targetId = targetId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidCountPointferenceError.prototype);
  }
}

// Carries every rejected cell rather than the first one, so one round trip is
// enough for the user to fix the whole file. Nothing is written when it throws.
class CountPointImportError extends Error {
  public readonly issues: ImportCountPointIssue[];

  constructor(issues: ImportCountPointIssue[]) {
    super(
      `${issues.length} ${issues.length === 1 ? "row" : "rows"} in the file could not be imported. Nothing was saved.`,
    );
    this.name = "CountPointImportError";
    this.issues = issues;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, CountPointImportError.prototype);
  }
}

export { InvalidCountPointferenceError, CountPointImportError };
