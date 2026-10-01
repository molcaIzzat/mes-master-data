// The time zone a piece of the hierarchy operates in.
//
// Only sites carry a zone (`ms_core.sites.timezone`). Everything below one
// inherits it through the chain:
//
//   work unit -> work center -> area -> site.timezone
//
// This module exists because that walk belongs to no single level: rooting it in
// `work-unit` would duplicate the query and the orphan handling in `work-center`,
// and rooting it in `site` would put a /work-units/:id route in a module named
// after a different resource.

// The two levels a consumer can hold an id for. Areas and sites are omitted
// deliberately: an area resolves through `GET /v1/areas/:id` -> `siteId` already,
// and a site IS the answer.
type TimezoneScope = "work-unit" | "work-center";

// `timezone` rather than `timeZone`: it mirrors the column and the wire. The
// camelCase boundary belongs to whoever consumes this, not to the payload.
type SiteTimezone = {
  siteId: number;
  siteCode: string;
  timezone: string;
};

// What the repository returns — the chain left NESTED rather than flattened.
//
// Flattening in the repository would collapse "no such work unit" and "the chain
// is broken" into the same `undefined`, and those are a 404 and a 409. Drizzle
// types every `one` relation as nullable, so each link is optional here for the
// same reason the service has to check it.
type SiteLink = { id: number; code: string; timezone: string };
type AreaLink = { id: number; site: SiteLink | null };
type WorkCenterLink = { id: number; area: AreaLink | null };

type WorkCenterChain = { id: number; area: AreaLink | null };
type WorkUnitChain = { id: number; workCenter: WorkCenterLink | null };

export type {
  AreaLink,
  SiteLink,
  SiteTimezone,
  TimezoneScope,
  WorkCenterChain,
  WorkCenterLink,
  WorkUnitChain,
};
