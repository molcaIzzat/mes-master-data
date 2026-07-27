import { isAxiosError } from "axios";

import type { ImportCountPointIssue } from "./types.js";

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

// A rejected import answers with the same envelope, except `data` carries a
// reason per offending cell. Undefined for every other failure, so the caller
// falls back to the plain message.
function extractIssues(err: unknown): ImportCountPointIssue[] | undefined {
  if (!isAxiosError(err)) return undefined;
  const payload = err.response?.data as { data?: { issues?: ImportCountPointIssue[] } } | undefined;
  const issues = payload?.data?.issues;
  return issues && issues.length > 0 ? issues : undefined;
}

export { firstError, extractError, extractIssues };
