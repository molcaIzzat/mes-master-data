class DuplicateWorkCenterError extends Error {
  public readonly codeWorkCenter?: string;

  constructor(codeWorkCenter?: string) {
    super(
      codeWorkCenter
        ? `work center with code "${codeWorkCenter}" already exists`
        : "work center already exists",
    );
    this.name = "DuplicateWorkCenterError";
    this.codeWorkCenter = codeWorkCenter;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateWorkCenterError.prototype);
  }
}

class InvalidWorkCenterReferenceError extends Error {
  public readonly columnName?: string;
  public readonly targetId?: string;

  constructor(columnName?: string, targetId?: string) {
    super(
      columnName && targetId
        ? `"${columnName}" with value "${targetId}" does not exist`
        : "references does not exist",
    );
    this.name = "InvalidWorkCenterReferenceError";
    this.columnName = columnName;
    this.targetId = targetId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidWorkCenterReferenceError.prototype);
  }
}

export { DuplicateWorkCenterError, InvalidWorkCenterReferenceError };
