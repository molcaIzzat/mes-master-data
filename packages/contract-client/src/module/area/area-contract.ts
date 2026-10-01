import type { AreaSummary, AreaPartialFetch } from "./area-dto.js";

type AreaClientContract = {
  existsById(id: number): Promise<boolean>;
  findById(id: number): Promise<AreaSummary | undefined>;
  getMany(ids: number[]): Promise<AreaPartialFetch<AreaSummary>>;
};

export type { AreaClientContract };
