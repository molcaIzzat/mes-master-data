import { DrizzleQueryError } from "drizzle-orm";

interface PgDriverError extends Error {
  detail?: string;
  code?: string; // e.g. '23503' for foreign_key_violation
  table?: string;
  constraint?: string;
}

function isPgDriverError(cause: unknown): cause is PgDriverError {
  return cause instanceof Error && typeof (cause as PgDriverError).detail === "string";
}

// --- Foreign key violation (23503) ---

function isFkViolation(error: unknown): error is DrizzleQueryError & { cause: PgDriverError } {
  return (
    error instanceof DrizzleQueryError &&
    isPgDriverError(error.cause) &&
    error.cause.code === "23503"
  );
}

class FkViolationError extends Error {
  constructor(
    public readonly column: string,
    public readonly value: string,
    public readonly table: string,
    public readonly original: DrizzleQueryError,
  ) {
    super(`FK violation: ${column}=${value} not present in ${table}`);
  }
}

function toFkViolationError(error: unknown): FkViolationError | null {
  if (!isFkViolation(error)) return null;

  const match = error.cause.detail?.match(
    /Key \(([^)]+)\)=\(([^)]+)\) is not present in table "([^"]+)"/,
  );
  if (!match) return null;

  const [, column, value, table] = match;
  return new FkViolationError(column, value, table, error);
}

// --- Unique violation (23505) ---

function isUqViolation(error: unknown): error is DrizzleQueryError & { cause: PgDriverError } {
  return (
    error instanceof DrizzleQueryError &&
    isPgDriverError(error.cause) &&
    error.cause.code === "23505"
  );
}

class UniqueViolationError extends Error {
  constructor(
    public readonly column: string,
    public readonly value: string,
    public readonly constraint: string | undefined,
    public readonly original: DrizzleQueryError,
  ) {
    super(`Unique violation: ${column}=${value} already exists`);
  }
}

function toUniqueViolationError(error: unknown): UniqueViolationError | null {
  if (!isUqViolation(error)) return null;

  // Detail looks like: Key (email)=(foo@bar.com) already exists.
  const match = error.cause.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/);
  if (!match) return null;

  const [, column, value] = match;
  return new UniqueViolationError(column, value, error.cause.constraint, error);
}

// --- Combined dispatcher ---

type PgConstraintError = FkViolationError | UniqueViolationError;

function toPgConstraintError(error: unknown): PgConstraintError | null {
  return toFkViolationError(error) ?? toUniqueViolationError(error);
}

function isUniqueViolation(error: unknown): error is DrizzleQueryError & { cause: PgDriverError } {
  return (
    error instanceof DrizzleQueryError &&
    isPgDriverError(error.cause) &&
    error.cause.code === "23505"
  );
}

function isForeignKeyViolation(
  error: unknown,
): error is DrizzleQueryError & { cause: PgDriverError } {
  return (
    error instanceof DrizzleQueryError &&
    isPgDriverError(error.cause) &&
    error.cause.code === "23503"
  );
}

export {
  isUniqueViolation,
  isForeignKeyViolation,
  toPgConstraintError,
  UniqueViolationError,
  FkViolationError,
};
