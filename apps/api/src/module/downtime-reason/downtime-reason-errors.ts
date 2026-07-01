class DuplicateDowntimeReasonError extends Error {
  public readonly codeDowntimeReason?: string;

  constructor(codeDowntimeReason?: string) {
    super(
      codeDowntimeReason
        ? `reason with code "${codeDowntimeReason}" already exists`
        : "reason already exists",
    );
    this.name = "DuplicateDowntimeReasonError";
    this.codeDowntimeReason = codeDowntimeReason;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateDowntimeReasonError.prototype);
  }
}

export { DuplicateDowntimeReasonError };
