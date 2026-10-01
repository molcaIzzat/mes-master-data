import type { Paged } from "@molca/network";

type Area = {
  id: number;
  siteId: number;
  name: string;
  code: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type AreaList = Omit<Area, "updatedAt">;

type AreaFilter = {
  q?: string;
  siteId?: number;
};

type ListAreaInput = {
  limit: number;
  offset: number;
  filter: AreaFilter;
};

type PagedArea = Paged<AreaList>;

type CreateArea = {
  name: string;
  code: string;
  siteId: number;
};

type UpdateArea = Partial<CreateArea>;

export type { Area, AreaFilter, AreaList, ListAreaInput, PagedArea, CreateArea, UpdateArea };
