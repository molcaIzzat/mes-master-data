import type { ImportOtherPointIssue } from "./other-point.js";

class InvalidOtherPointReferenceError extends Error {
  public readonly columnName?: string;
  public readonly targetId?: string;

  constructor(columnName?: string, targetId?: string) {
    super(
      columnName && targetId
        ? `"${columnName}" with value "${targetId}" does not exist`
        : "references does not exist",
    );
    this.name = "InvalidOtherPointReferenceError";
    this.columnName = columnName;
    this.targetId = targetId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidOtherPointReferenceError.prototype);
  }
}

// Carries every rejected cell rather than the first one, so one round trip is
// enough for the user to fix the whole file. Nothing is written when it throws.
class OtherPointImportError extends Error {
  public readonly issues: ImportOtherPointIssue[];

  constructor(issues: ImportOtherPointIssue[]) {
    super(
      `${issues.length} ${issues.length === 1 ? "row" : "rows"} in the file could not be imported. Nothing was saved.`,
    );
    this.name = "OtherPointImportError";
    this.issues = issues;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, OtherPointImportError.prototype);
  }
}

export { InvalidOtherPointReferenceError, OtherPointImportError };
