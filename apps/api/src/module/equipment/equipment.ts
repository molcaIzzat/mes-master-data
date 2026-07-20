import type { Paged } from "@molca/network";

type Equipment = {
  id: number;
  code: string;
  name: string;
  unit: {
    id: number;
    code: string;
    name: string;
  } | null;
  class: {
    id: number;
    code: string;
    name: string;
  } | null;
  productSignalTag: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type EquipmentList = Omit<Equipment, "updatedAt">;

type EquipmentFilter = {
  q?: string;
};

type ListEquipmentInput = {
  limit: number;
  offset: number;
  filter: EquipmentFilter;
};

type PagedEquipment = Paged<EquipmentList>;

type CreateEquipment = {
  code: string;
  name: string;
  workUnitId: number;
  equipmentClassId: number | null;
  productSignalTag: string;
};

type UpdateEquipment = Partial<CreateEquipment>;

export type {
  Equipment,
  EquipmentList,
  EquipmentFilter,
  ListEquipmentInput,
  PagedEquipment,
  CreateEquipment,
  UpdateEquipment,
};
