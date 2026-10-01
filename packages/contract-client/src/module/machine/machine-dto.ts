type MachineSummary = {
  id: number;
  name: string;
  code: string;
};

type MachinePartialFetch<T> = {
  found: T[];
  missingIds: number[];
};

export type { MachineSummary, MachinePartialFetch };
