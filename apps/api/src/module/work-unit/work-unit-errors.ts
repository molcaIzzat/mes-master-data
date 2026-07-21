class DuplicateWorkUnitError extends Error {
  public readonly codeWorkUnit?: string;

  constructor(codeWorkUnit?: string) {
    super(
      codeWorkUnit
        ? `work center with code "${codeWorkUnit}" already exists`
        : "work center already exists",
    );
    this.name = "DuplicateWorkUnitError";
    this.codeWorkUnit = codeWorkUnit;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateWorkUnitError.prototype);
  }
}

class InvalidWorkUnitReferenceError extends Error {
  public readonly columnName?: string;
  public readonly targetId?: string;

  constructor(columnName?: string, targetId?: string) {
    super(
      columnName && targetId
        ? `"${columnName}" with value "${targetId}" does not exist`
        : "references does not exist",
    );
    this.name = "InvalidWorkUnitReferenceError";
    this.columnName = columnName;
    this.targetId = targetId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidWorkUnitReferenceError.prototype);
  }
}

export { DuplicateWorkUnitError, InvalidWorkUnitReferenceError };
