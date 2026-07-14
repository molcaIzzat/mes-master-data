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

class InvalidWorkCenterAreaIdReferenceError extends Error {
  public readonly areaId?: number;

  constructor(areaId?: number) {
    super(areaId ? `area "${areaId}" does not exist` : "area does not exist");
    this.name = "InvalidWorkCenterAreaIdReferenceError";
    this.areaId = areaId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidWorkCenterAreaIdReferenceError.prototype);
  }
}

export { DuplicateWorkCenterError, InvalidWorkCenterAreaIdReferenceError };
