import type { TimezoneScope } from "./timezone.js";

// A row exists but its chain to a site does not resolve.
//
// Structurally this should be unreachable: `work_units.work_center_id`,
// `work_centers.area_id` and `areas.site_id` are all NOT NULL with
// ON DELETE restrict. The one realistic way to see it is a CROSS-REGION row —
// the FK points at a real parent, but that parent belongs to another tenant, so
// the region-filtered join yields null. That is bad data, not a server fault,
// which is why it maps to 409 like every other Invalid*ReferenceError here
// rather than to a 500.
class OrphanedHierarchyError extends Error {
  public readonly scope: TimezoneScope;
  public readonly scopeId: number;
  public readonly brokenLink: string;

  constructor(scope: TimezoneScope, scopeId: number, brokenLink: string) {
    super(`${scope} "${scopeId}" does not resolve to a site: "${brokenLink}" is missing`);
    this.name = "OrphanedHierarchyError";
    this.scope = scope;
    this.scopeId = scopeId;
    this.brokenLink = brokenLink;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, OrphanedHierarchyError.prototype);
  }
}

export { OrphanedHierarchyError };
