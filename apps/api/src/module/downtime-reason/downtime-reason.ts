import type { AreaSummary, EquipmentSummary, WorkCenterSummary } from "@molca/contract-client";
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
  workCenterIds: number[];
  equipmentIds: number[];
  createdAt: Date;
  updatedAt: Date;
};

type DowntimeReasonEnriched = {
  id: number;
  name: string;
  code: string;
  category: DowntimeReasonCategory;
  areas: AreaSummary[];
  workCenters: WorkCenterSummary[];
  equipments: EquipmentSummary[];
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
  // Scopes the list to the reasons attached to ONE line, via
  // `downtime_reasons_work_centers`. Added for mes-oee-monitor's downtime edit
  // dialog, where the operator picks a reason for a stop that already belongs to
  // a known line — offering the whole region's catalogue there is how a stop on
  // the filler ends up labelled with a palletiser reason.
  //
  // Independent of `areaId` rather than nested under it: the two junction tables
  // are separate, a reason may be attached to a line without its area, and
  // requiring both would silently drop those rows.
  workCenterId?: number;
};

type ListDowntimeReasonInput = {
  limit: number;
  offset: number;
  filter: DowntimeReasonFilter;
};

type PagedDowntimeReason = Paged<DowntimeReasonList>;

type CreateDowntimeReason = {
  areaIds: number[];
  workCenterIds: number[];
  equipmentIds: number[];
  category: DowntimeReasonCategory;
  code: string;
  name: string;
};

type UpdateDowntimeReason = Partial<CreateDowntimeReason>;

export { DOWNTIME_REASON_CATEGORY };
export type {
  DowntimeReason,
  DowntimeReasonList,
  DowntimeReasonFilter,
  ListDowntimeReasonInput,
  PagedDowntimeReason,
  DowntimeReasonEnriched,
  DowntimeReasonEnrichedList,
  CreateDowntimeReason,
  UpdateDowntimeReason,
};
