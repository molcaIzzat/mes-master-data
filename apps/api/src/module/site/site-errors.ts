class DuplicateSiteError extends Error {
  public readonly codeSite?: string;

  constructor(codeSite?: string) {
    super(codeSite ? `site with code "${codeSite}" already exists` : "site already exists");
    this.name = "DuplicateSiteError";
    this.codeSite = codeSite;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateSiteError.prototype);
  }
}

export { DuplicateSiteError };
