type AreaSummary = {
  id: number;
  name: string;
  code: string;
};

type AreaPartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { AreaSummary, AreaPartialFetch };
