type AreaSummary = {
  id: number;
  name: string;
  displayName: string | null;
};

type AreaPartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { AreaSummary, AreaPartialFetch };
