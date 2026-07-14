import type { Paged } from "@molca/network";

const WORK_CENTER_OEE_MODE = ["continuous", "batch", "discrete", "none"] as const;
const WORK_CENTER_TYPE = [
  "production_line", // discrete
  "process_cell", // batch      ← your Area B
  "production_unit", // continuous ← your Area A
  "storage_zone",
] as const;

type WorkCenterOeeMode = (typeof WORK_CENTER_OEE_MODE)[number];
type WorkCenterType = (typeof WORK_CENTER_TYPE)[number];

type WorkCenter = {
  id: number;
  code: string;
  name: string;
  area: {
    id: number;
    code: string;
    name: string;
  } | null;
  type: WorkCenterType;
  oeeMode: WorkCenterOeeMode;
  class: {
    id: number;
    code: string;
    name: string;
  } | null;
  idealRatePerHour: string | null;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkCenterList = Omit<WorkCenter, "updatedAt">;

type WorkCenterFilter = {
  q?: string;
  areaId?: number;
  type?: WorkCenterType;
};

type ListWorkCenterInput = {
  limit: number;
  offset: number;
  filter: WorkCenterFilter;
};

type PagedWorkCenter = Paged<WorkCenterList>;

type CreateWorkCenter = {
  code: string;
  name: string;
  areaId: number;
  type: WorkCenterType;
  oeeMode: WorkCenterOeeMode;
  workCenterClassId: number | null;
  idealRatePerHour: string | null;
};

type UpdateWorkCenter = Partial<CreateWorkCenter>;

export { WORK_CENTER_OEE_MODE, WORK_CENTER_TYPE };
export type {
  WorkCenter,
  WorkCenterList,
  WorkCenterFilter,
  ListWorkCenterInput,
  PagedWorkCenter,
  CreateWorkCenter,
  UpdateWorkCenter,
  WorkCenterOeeMode,
  WorkCenterType,
};
