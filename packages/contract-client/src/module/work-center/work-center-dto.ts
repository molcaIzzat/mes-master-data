type WorkCenterSummary = {
  id: number;
  name: string;
  code: string;
};

type WorkCenterPartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { WorkCenterSummary, WorkCenterPartialFetch };
