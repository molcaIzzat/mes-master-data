import type { Paged } from "@molca/network";

type EquipmentClass = {
  id: number;
  code: string;
  name: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type EquipmentClassList = Omit<EquipmentClass, "updatedAt">;

type EquipmentClassFilter = {
  q?: string;
};

type ListEquipmentClassInput = {
  limit: number;
  offset: number;
  filter: EquipmentClassFilter;
};

type PagedEquipmentClass = Paged<EquipmentClassList>;

type CreateEquipmentClass = {
  code: string;
  name: string;
};

type UpdateEquipmentClass = Partial<CreateEquipmentClass>;

export type {
  EquipmentClass,
  EquipmentClassList,
  EquipmentClassFilter,
  ListEquipmentClassInput,
  PagedEquipmentClass,
  CreateEquipmentClass,
  UpdateEquipmentClass,
};
