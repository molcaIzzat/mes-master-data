import type { Paged } from "@molca/network";

type Area = {
  id: number;
  factoryId: number | null;
  name: string;
  displayName: string | null;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type AreaList = Omit<Area, "updatedAt">;

type AreaFilter = {
  q?: string;
  factoryId?: number;
};

type ListAreaInput = {
  limit: number;
  offset: number;
  filter: AreaFilter;
};

type PagedArea = Paged<AreaList>;

type CreateArea = {
  name: string;
  displayName: string | null;
  factoryId: number | null;
};

type UpdateArea = Partial<CreateArea>;

export type { Area, AreaFilter, AreaList, ListAreaInput, PagedArea, CreateArea, UpdateArea };
