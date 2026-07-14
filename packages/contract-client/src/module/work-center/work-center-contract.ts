import type { WorkCenterSummary, WorkCenterPartialFetch } from "./work-center-dto.js";

type WorkCenterClientContract = {
  existsById(id: number): Promise<boolean>;
  getMany(ids: number[]): Promise<WorkCenterPartialFetch<WorkCenterSummary>>;
};

export type { WorkCenterClientContract };
