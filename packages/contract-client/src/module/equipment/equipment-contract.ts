import type { EquipmentSummary, EquipmentPartialFetch } from "./equipment-dto.js";

type EquipmentClientContract = {
  existsById(id: number): Promise<boolean>;
  getMany(ids: number[]): Promise<EquipmentPartialFetch<EquipmentSummary>>;
};

export type { EquipmentClientContract };
