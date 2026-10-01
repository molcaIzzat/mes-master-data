class DuplicateWorkCenterClassError extends Error {
  public readonly codeWorkCenterClass?: string;

  constructor(codeWorkCenterClass?: string) {
    super(
      codeWorkCenterClass
        ? `class with code "${codeWorkCenterClass}" already exists`
        : "class already exists",
    );
    this.name = "DuplicateWorkCenterClassError";
    this.codeWorkCenterClass = codeWorkCenterClass;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateWorkCenterClassError.prototype);
  }
}

export { DuplicateWorkCenterClassError };
