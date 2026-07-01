class DuplicateDowntimeActionError extends Error {
  public readonly codeDowntimeAction?: string;

  constructor(codeDowntimeAction?: string) {
    super(
      codeDowntimeAction
        ? `action with code "${codeDowntimeAction}" already exists`
        : "action already exists",
    );
    this.name = "DuplicateDowntimeActionError";
    this.codeDowntimeAction = codeDowntimeAction;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateDowntimeActionError.prototype);
  }
}

export { DuplicateDowntimeActionError };
