class DuplicateProductError extends Error {
  public readonly codeProduct?: string;

  constructor(codeProduct?: string) {
    super(
      codeProduct ? `product with code "${codeProduct}" already exists` : "product already exists",
    );
    this.name = "DuplicateProductError";
    this.codeProduct = codeProduct;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateProductError.prototype);
  }
}

class InvalidProductAreaIdReferenceError extends Error {
  public readonly areaId?: number;

  constructor(areaId?: number) {
    super(areaId ? `area "${areaId}" does not exist` : "area does not exist");
    this.name = "InvalidProductAreaIdReferenceError";
    this.areaId = areaId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidProductAreaIdReferenceError.prototype);
  }
}

export { DuplicateProductError, InvalidProductAreaIdReferenceError };
