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

class InvalidAreaSiteIdReferenceError extends Error {
  public readonly siteId?: number;

  constructor(siteId?: number) {
    super(siteId ? `site "${siteId}" does not exist` : "site does not exist");
    this.name = "InvalidAreaSiteIdReferenceError";
    this.siteId = siteId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidAreaSiteIdReferenceError.prototype);
  }
}

export { DuplicateAreaError, InvalidAreaSiteIdReferenceError };
