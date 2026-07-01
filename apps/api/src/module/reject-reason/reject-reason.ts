import type { AreaSummary, LineSummary, MachineSummary } from "@molca/contract-client";
import type { Paged } from "@molca/network";

type RejectReason = {
  id: number;
  name: string;
  code: string;
  region: string;
  areaIds: number[];
  lineIds: number[];
  machineIds: number[];
  createdAt: Date;
  updatedAt: Date;
};

type RejectReasonEnriched = {
  id: number;
  name: string;
  code: string;
  areas: AreaSummary[];
  lines: LineSummary[];
  machines: MachineSummary[];
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type RejectReasonList = Omit<RejectReason, "updatedAt">;
type RejectReasonEnrichedList = Omit<RejectReasonEnriched, "updatedAt">;

type RejectReasonFilter = {
  q?: string;
  areaId?: number;
};

type ListRejectReasonInput = {
  limit: number;
  offset: number;
  filter: RejectReasonFilter;
};

type PagedRejectReason = Paged<RejectReasonList>;

type CreateRejectReason = {
  areaIds: number[];
  lineIds: number[];
  machineIds: number[];
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
