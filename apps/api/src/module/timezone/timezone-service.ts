import { HTTPException } from "hono/http-exception";
import { baseLogger, getRequestContext } from "@molca/observability";

import { OrphanedHierarchyError } from "./timezone-errors.js";

import type { Logger } from "@molca/utils";
import type { TimezoneReader } from "./timezone-repository.js";
import type { AreaLink, SiteTimezone, TimezoneScope } from "./timezone.js";

type TimezoneServiceDeps = {
  timezoneReaderRepository: TimezoneReader;
  logger?: Logger;
};

type TTimezoneService = {
  findByWorkUnitId: (id: number) => Promise<SiteTimezone>;
  findByWorkCenterId: (id: number) => Promise<SiteTimezone>;
};

class TimezoneService implements TTimezoneService {
  private timezoneReaderRepository: TimezoneReader;
  private fallbackLogger: Logger;

  constructor({ timezoneReaderRepository, logger }: TimezoneServiceDeps) {
    this.timezoneReaderRepository = timezoneReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findByWorkUnitId(id: number): Promise<SiteTimezone> {
    const row = await this.timezoneReaderRepository.findWorkUnitChain(id);
    if (!row) throw new HTTPException(404, { message: "work unit not found" });

    if (row.workCenter === null) throw this.orphaned("work-unit", id, "work center");
    return this.fromArea("work-unit", id, row.workCenter.area);
  }

  async findByWorkCenterId(id: number): Promise<SiteTimezone> {
    const row = await this.timezoneReaderRepository.findWorkCenterChain(id);
    if (!row) throw new HTTPException(404, { message: "work center not found" });

    return this.fromArea("work-center", id, row.area);
  }

  // The tail of both walks, shared so the two entry points cannot report a broken
  // chain differently.
  private fromArea(scope: TimezoneScope, scopeId: number, area: AreaLink | null): SiteTimezone {
    if (area === null) throw this.orphaned(scope, scopeId, "area");
    if (area.site === null) throw this.orphaned(scope, scopeId, "site");

    return {
      siteId: area.site.id,
      siteCode: area.site.code,
      timezone: area.site.timezone,
    };
  }

  // Logged before it is thrown, and at `warn` rather than `debug`: a 409 here
  // means a row's parent is missing or belongs to another region, which nobody
  // will notice from the response alone — the caller just sees a failed request.
  private orphaned(scope: TimezoneScope, scopeId: number, brokenLink: string) {
    const err = new OrphanedHierarchyError(scope, scopeId, brokenLink);
    this.logger
      .withMetadata({
        event: "timezone_hierarchy_orphaned",
        scope,
        scope_id: scopeId,
        broken_link: brokenLink,
      })
      .warn("timezone_hierarchy_orphaned");
    return err;
  }
}

export { TimezoneService };
export type { TimezoneServiceDeps, TTimezoneService };
