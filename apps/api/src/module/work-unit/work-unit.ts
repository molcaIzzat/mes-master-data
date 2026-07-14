import type { Paged } from "@molca/network";

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
  type: WorkUnitType;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkUnitList = Omit<WorkUnit, "updatedAt">;

type WorkUnitFilter = {
  q?: string;
  workCenterId?: number;
  type?: WorkUnitType;
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
  type: WorkUnitType;
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
