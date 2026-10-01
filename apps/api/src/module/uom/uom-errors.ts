class DuplicateUomError extends Error {
  public readonly codeUom?: string;

  constructor(codeUom?: string) {
    super(codeUom ? `uom with code "${codeUom}" already exists` : "uom already exists");
    this.name = "DuplicateUomError";
    this.codeUom = codeUom;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateUomError.prototype);
  }
}

export { DuplicateUomError };
