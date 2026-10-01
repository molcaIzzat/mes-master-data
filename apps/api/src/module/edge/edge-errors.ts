// The error mapper hands `message` straight to the response envelope, so it has
// to read as a sentence: it is what the DAG editor shows when a connection is
// refused. The dumped `obj` stays on the error for the logs.
function topologyMessage(obj?: Record<string, unknown>): string {
  if (!obj) return "invalid topology";

  const errors = obj.errors;
  if (Array.isArray(errors)) {
    const first = errors[0];
    if (first && typeof first === "object" && "message" in first) {
      return String((first as { message: unknown }).message);
    }
  }

  return `invalid topology ${JSON.stringify(obj)}`;
}

class InvalidTopology extends Error {
  public readonly obj?: Record<string, unknown>;
  constructor(obj?: Record<string, unknown>) {
    super(topologyMessage(obj));
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

class DuplicateEdgeError extends Error {
  constructor() {
    super("these two machines are already connected in this direction");
    this.name = "DuplicateEdgeError";
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateEdgeError.prototype);
  }
}

export { DuplicateEdgeError, InvalidEdgeReferenceError, InvalidTopology };
