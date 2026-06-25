import { DrizzleQueryError } from "drizzle-orm";

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof DrizzleQueryError) {
    return (
      err.cause !== null &&
      err.cause !== undefined &&
      "code" in err.cause &&
      (err.cause as { code?: string }).code === "23505"
    );
  }

  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

function isForeignKeyViolation(err: unknown): boolean {
  if (err instanceof DrizzleQueryError) {
    return (
      err.cause !== null &&
      err.cause !== undefined &&
      "code" in err.cause &&
      (err.cause as { code?: string }).code === "23503"
    );
  }
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23503"
  );
}

export { isUniqueViolation, isForeignKeyViolation };
