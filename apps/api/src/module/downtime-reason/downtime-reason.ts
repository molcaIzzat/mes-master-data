import type { AreaSummary, LineSummary, MachineSummary } from "@molca/contract-client";
import type { Paged } from "@molca/network";

const DOWNTIME_REASON_CATEGORY = ["PLANNED", "UNPLANNED", "SMALL_STOP"] as const;

type DowntimeReasonCategory = (typeof DOWNTIME_REASON_CATEGORY)[number];

type DowntimeReason = {
  id: number;
  name: string;
  code: string;
  category: DowntimeReasonCategory;
  region: string;
  areaIds: number[];
  lineIds: number[];
  machineIds: number[];
  createdAt: Date;
  updatedAt: Date;
};

type DowntimeReasonEnriched = {
  id: number;
  name: string;
  code: string;
  category: DowntimeReasonCategory;
  areas: AreaSummary[];
  lines: LineSummary[];
  machines: MachineSummary[];
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type DowntimeReasonList = Omit<DowntimeReason, "updatedAt">;
type DowntimeReasonEnrichedList = Omit<DowntimeReasonEnriched, "updatedAt">;

type DowntimeReasonFilter = {
  q?: string;
  category?: DowntimeReasonCategory;
  areaId?: number;
};

type ListDowntimeReasonInput = {
  limit: number;
  offset: number;
  filter: DowntimeReasonFilter;
};

type PagedDowntimeReason = Paged<DowntimeReasonList>;

export { DOWNTIME_REASON_CATEGORY };
export type {
  DowntimeReason,
  DowntimeReasonList,
  DowntimeReasonFilter,
  ListDowntimeReasonInput,
  PagedDowntimeReason,
  DowntimeReasonEnriched,
  DowntimeReasonEnrichedList,
};
