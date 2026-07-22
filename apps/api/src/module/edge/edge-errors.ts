class InvalidTopology extends Error {
  public readonly obj?: Record<string, unknown>;
  constructor(obj?: Record<string, unknown>) {
    super(obj ? `Invalid topology ${JSON.stringify(obj)}` : "Invlid topology");
    this.name = "InvalidTopology";
    this.obj = obj;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidTopology.prototype);
  }
}

class InvalidEdgeReferenceError extends Error {
  public readonly columnName?: string;
  public readonly targetId?: string;

  constructor(columnName?: string, targetId?: string) {
    super(
      columnName && targetId
        ? `"${columnName}" with value "${targetId}" does not exist`
        : "references does not exist",
    );
    this.name = "InvalidEdgeReferenceError";
    this.columnName = columnName;
    this.targetId = targetId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidEdgeReferenceError.prototype);
  }
}

export { InvalidEdgeReferenceError, InvalidTopology };
