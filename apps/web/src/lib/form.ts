import { isAxiosError } from "axios";

// Standard Schema (zod) surfaces errors as issue objects; pull the first message.
function firstError(errors: unknown[]): string | undefined {
  const e = errors[0];
  if (e == null) return undefined;
  if (typeof e === "string") return e;
  if (typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return undefined;
}

// Prefer the API's error envelope message (e.g. duplicate code) over a generic one.
function extractError(err: unknown, fallback: string): string {
  const apiError = isAxiosError(err)
    ? (err.response?.data as { error?: string } | undefined)?.error
    : undefined;
  return apiError ?? fallback;
}

export { firstError, extractError };
