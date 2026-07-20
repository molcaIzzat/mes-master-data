import type { Paged } from "@molca/network";

type Enterprise = {
  id: number;
  name: string;
  code: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type EnterpriseList = Omit<Enterprise, "updatedAt">;

type EnterpriseFilter = {
  q?: string;
};

type ListEnterpriseInput = {
  limit: number;
  offset: number;
  filter: EnterpriseFilter;
};

type PagedEnterprise = Paged<EnterpriseList>;

type CreateEnterprise = {
  name: string;
  code: string;
};

type UpdateEnterprise = Partial<CreateEnterprise>;

export type {
  Enterprise,
  EnterpriseFilter,
  EnterpriseList,
  ListEnterpriseInput,
  PagedEnterprise,
  CreateEnterprise,
  UpdateEnterprise,
};
