class DuplicateRejectReasonError extends Error {
  public readonly codeRejectReason?: string;

  constructor(codeRejectReason?: string) {
    super(
      codeRejectReason
        ? `reason with code "${codeRejectReason}" already exists`
        : "reason already exists",
    );
    this.name = "DuplicateRejectReasonError";
    this.codeRejectReason = codeRejectReason;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateRejectReasonError.prototype);
  }
}

export { DuplicateRejectReasonError };
