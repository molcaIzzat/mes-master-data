import type { Paged } from "@molca/network";

import type { Position } from "../../shared/database/helper/common.js";

const WORK_UNIT_TYPE = [
  "work_cell", // under production_line
  "unit", // under process_cell / production_unit
  "storage_unit", // under storage_zone
] as const;

type WorkUnitType = (typeof WORK_UNIT_TYPE)[number];

type WorkUnit = {
  id: number;
  code: string;
  name: string;
  workCenter: {
    id: number;
    code: string;
    name: string;
  } | null;
  class: {
    id: number;
    code: string;
    name: string;
  } | null;
  type: WorkUnitType;
  position: Position;
  isOeeRelevant: boolean;
  isAcquirable: boolean;
  telemetryTags: Record<string, string> | null;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkUnitList = Omit<WorkUnit, "updatedAt">;

type WorkUnitFilter = {
  q?: string;
  workCenterId?: number;
  type?: WorkUnitType;
  // Bulk lookup by primary key, for cross-service callers resolving a batch of
  // work-unit ids in one request instead of N `GET /:id` round-trips. Never an
  // empty array — the DTO maps an empty list to undefined so no `IN ()` is built.
  ids?: number[];
};

type ListWorkUnitInput = {
  limit: number;
  offset: number;
  filter: WorkUnitFilter;
};

type PagedWorkUnit = Paged<WorkUnitList>;

type CreateWorkUnit = {
  code: string;
  name: string;
  workCenterId: number;
  workUnitClassId: number | null;
  isOeeRelevant: boolean;
  isAcquirable: boolean;
  telemetryTags: Record<string, string> | null;
  type: WorkUnitType;
  position: Position;
};

type UpdateWorkUnit = Partial<CreateWorkUnit>;

export { WORK_UNIT_TYPE };
export type {
  WorkUnit,
  WorkUnitList,
  WorkUnitFilter,
  ListWorkUnitInput,
  PagedWorkUnit,
  CreateWorkUnit,
  UpdateWorkUnit,
  WorkUnitType,
};
