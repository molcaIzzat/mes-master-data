class DuplicateWorkUnitClassError extends Error {
  public readonly codeWorkUnitClass?: string;

  constructor(codeWorkUnitClass?: string) {
    super(
      codeWorkUnitClass
        ? `class with code "${codeWorkUnitClass}" already exists`
        : "class already exists",
    );
    this.name = "DuplicateWorkUnitClassError";
    this.codeWorkUnitClass = codeWorkUnitClass;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateWorkUnitClassError.prototype);
  }
}

export { DuplicateWorkUnitClassError };
