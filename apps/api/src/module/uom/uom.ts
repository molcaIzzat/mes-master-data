import type { Paged } from "@molca/network";

type Uom = {
  id: number;
  code: string;
  name: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type UomList = Omit<Uom, "updatedAt">;

type UomFilter = {
  q?: string;
};

type ListUomInput = {
  limit: number;
  offset: number;
  filter: UomFilter;
};

type PagedUom = Paged<UomList>;

type CreateUom = {
  code: string;
  name: string;
};

type UpdateUom = Partial<CreateUom>;

export type { Uom, UomList, UomFilter, ListUomInput, PagedUom, CreateUom, UpdateUom };
