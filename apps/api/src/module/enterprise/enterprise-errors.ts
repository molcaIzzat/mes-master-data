class DuplicateEnterpriseError extends Error {
  public readonly codeEnterprise?: string;

  constructor(codeEnterprise?: string) {
    super(
      codeEnterprise
        ? `enterprise with name "${codeEnterprise}" already exists`
        : "enterprise already exists",
    );
    this.name = "DuplicateEnterpriseError";
    this.codeEnterprise = codeEnterprise;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateEnterpriseError.prototype);
  }
}

export { DuplicateEnterpriseError };
