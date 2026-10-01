import type { MachineSummary, MachinePartialFetch } from "./machine-dto.js";

type MachineClientContract = {
  existsById(id: number): Promise<boolean>;
  getMany(ids: number[]): Promise<MachinePartialFetch<MachineSummary>>;
};

export type { MachineClientContract };
