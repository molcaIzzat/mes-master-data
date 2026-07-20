type EnterpriseSummary = {
  id: number;
  name: string;
  code: string;
};

type EnterprisePartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { EnterpriseSummary, EnterprisePartialFetch };
