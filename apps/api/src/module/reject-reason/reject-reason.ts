import type { AreaSummary, WorkCenterSummary, EquipmentSummary } from "@molca/contract-client";
import type { Paged } from "@molca/network";

type RejectReason = {
  id: number;
  name: string;
  code: string;
  region: string;
  areaIds: number[];
  workCenterIds: number[];
  equipmentIds: number[];
  createdAt: Date;
  updatedAt: Date;
};

type RejectReasonEnriched = {
  id: number;
  name: string;
  code: string;
  areas: AreaSummary[];
  workCenters: WorkCenterSummary[];
  equipments: EquipmentSummary[];
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type RejectReasonList = Omit<RejectReason, "updatedAt">;
type RejectReasonEnrichedList = Omit<RejectReasonEnriched, "updatedAt">;

type RejectReasonFilter = {
  q?: string;
  areaId?: number;
  // Scopes the list to the reasons attached to ONE line, via
  // `reject_reasons_work_centers`. Added for mes-oee-monitor's reject/rework entry
  // dialog, where an operator records a reject against a report that already
  // belongs to a known line — offering the whole region's catalogue there is how a
  // reject on the filler ends up labelled with a palletiser reason, and the reason
  // is what the Quality Pareto groups on.
  //
  // Independent of `areaId` rather than nested under it: the two junction tables
  // are separate, a reason may be attached to a line without its area, and
  // requiring both would silently drop those rows. Same call downtime-reason made.
  workCenterId?: number;
};

type ListRejectReasonInput = {
  limit: number;
  offset: number;
  filter: RejectReasonFilter;
};

type PagedRejectReason = Paged<RejectReasonList>;

type CreateRejectReason = {
  areaIds: number[];
  workCenterIds: number[];
  equipmentIds: number[];
  code: string;
  name: string;
};

type UpdateRejectReason = Partial<CreateRejectReason>;

export type {
  RejectReason,
  RejectReasonList,
  RejectReasonFilter,
  ListRejectReasonInput,
  PagedRejectReason,
  RejectReasonEnriched,
  RejectReasonEnrichedList,
  CreateRejectReason,
  UpdateRejectReason,
};
