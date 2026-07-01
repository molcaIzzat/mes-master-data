import type { AreaSummary, AreaPartialFetch } from "./area-dto.js";

type AreaClientContract = {
  existsById(id: number): Promise<boolean>;
  getMany(ids: number[]): Promise<AreaPartialFetch<AreaSummary>>;
};

export type { AreaClientContract };
