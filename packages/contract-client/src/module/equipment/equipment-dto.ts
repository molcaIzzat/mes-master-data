type EquipmentSummary = {
  id: number;
  name: string;
  code: string;
};

type EquipmentPartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { EquipmentSummary, EquipmentPartialFetch };
