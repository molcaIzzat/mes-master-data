class DuplicateLineError extends Error {
  public readonly codeLine?: string;

  constructor(codeLine?: string) {
    super(codeLine ? `line with code "${codeLine}" already exists` : "line already exists");
    this.name = "DuplicateLineError";
    this.codeLine = codeLine;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateLineError.prototype);
  }
}

class InvalidLineAreaIdReferenceError extends Error {
  public readonly areaId?: number;

  constructor(areaId?: number) {
    super(areaId ? `area "${areaId}" does not exist` : "area does not exist");
    this.name = "InvalidLineAreaIdReferenceError";
    this.areaId = areaId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidLineAreaIdReferenceError.prototype);
  }
}

export { DuplicateLineError, InvalidLineAreaIdReferenceError };
