import type { Paged } from "@molca/network";

import type { Position } from "../../shared/database/helper/common.js";

type Equipment = {
  id: number;
  code: string;
  name: string;
  unit: {
    id: number;
    code: string;
    name: string;
  } | null;
  parent: {
    id: number;
    code: string;
    name: string;
  } | null;
  class: {
    id: number;
    code: string;
    name: string;
  } | null;
  isOeeRelevant: boolean;
  isAcquirable: boolean;
  telemetryTags: Record<string, string> | null;
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
  parentEquipmentId: number | null;
  equipmentClassId: number | null;
  isOeeRelevant: boolean;
  isAcquirable: boolean;
  position: Position;
  telemetryTags: Record<string, string> | null;
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
