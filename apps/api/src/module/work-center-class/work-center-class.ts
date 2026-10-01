import type { Paged } from "@molca/network";

type WorkCenterClass = {
  id: number;
  code: string;
  name: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkCenterClassList = Omit<WorkCenterClass, "updatedAt">;

type WorkCenterClassFilter = {
  q?: string;
};

type ListWorkCenterClassInput = {
  limit: number;
  offset: number;
  filter: WorkCenterClassFilter;
};

type PagedWorkCenterClass = Paged<WorkCenterClassList>;

type CreateWorkCenterClass = {
  code: string;
  name: string;
};

type UpdateWorkCenterClass = Partial<CreateWorkCenterClass>;

export type {
  WorkCenterClass,
  WorkCenterClassList,
  WorkCenterClassFilter,
  ListWorkCenterClassInput,
  PagedWorkCenterClass,
  CreateWorkCenterClass,
  UpdateWorkCenterClass,
};
