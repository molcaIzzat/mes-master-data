type LineSummary = {
  id: number;
  name: string;
  code: string;
};

type LinePartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { LineSummary, LinePartialFetch };
