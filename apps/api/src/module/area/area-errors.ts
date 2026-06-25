class DuplicateAreaError extends Error {
  public readonly nameArea?: string;

  constructor(nameArea?: string) {
    super(nameArea ? `area with name "${nameArea}" already exists` : "area already exists");
    this.name = "DuplicateAreaError";
    this.nameArea = nameArea;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateAreaError.prototype);
  }
}

export { DuplicateAreaError };
