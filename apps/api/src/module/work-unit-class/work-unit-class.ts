import type { Paged } from "@molca/network";

type WorkUnitClass = {
  id: number;
  code: string;
  name: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkUnitClassList = Omit<WorkUnitClass, "updatedAt">;

type WorkUnitClassFilter = {
  q?: string;
};

type ListWorkUnitClassInput = {
  limit: number;
  offset: number;
  filter: WorkUnitClassFilter;
};

type PagedWorkUnitClass = Paged<WorkUnitClassList>;

type CreateWorkUnitClass = {
  code: string;
  name: string;
};

type UpdateWorkUnitClass = Partial<CreateWorkUnitClass>;

export type {
  WorkUnitClass,
  WorkUnitClassList,
  WorkUnitClassFilter,
  ListWorkUnitClassInput,
  PagedWorkUnitClass,
  CreateWorkUnitClass,
  UpdateWorkUnitClass,
};
