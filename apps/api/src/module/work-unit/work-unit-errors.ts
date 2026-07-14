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

class InvalidWorkUnitWorkCenterIdReferenceError extends Error {
  public readonly workCenterId?: number;

  constructor(workCenterId?: number) {
    super(
      workCenterId ? `work center "${workCenterId}" does not exist` : "work center does not exist",
    );
    this.name = "InvalidWorkUnitWorkCenterIdReferenceError";
    this.workCenterId = workCenterId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidWorkUnitWorkCenterIdReferenceError.prototype);
  }
}

export { DuplicateWorkUnitError, InvalidWorkUnitWorkCenterIdReferenceError };
