import type { EnterpriseSummary, EnterprisePartialFetch } from "./enterprise-dto.js";

type EnterpriseClientContract = {
  existsById(id: number): Promise<boolean>;
  findById(id: number): Promise<EnterpriseSummary | undefined>;
  getMany(ids: number[]): Promise<EnterprisePartialFetch<EnterpriseSummary>>;
};

export type { EnterpriseClientContract };
