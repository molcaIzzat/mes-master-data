import type { EnterpriseSummary } from "@molca/contract-client";
import type { Paged } from "@molca/network";

type Site = {
  id: number;
  code: string;
  name: string;
  timezone: string;
  enterpriseId: number | null;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type SiteEnriched = {
  id: number;
  code: string;
  name: string;
  timezone: string;
  enterprise: EnterpriseSummary | null;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type SiteList = Omit<Site, "updatedAt">;
type SiteEnrichedList = Omit<SiteEnriched, "updatedAt">;

type SiteFilter = {
  q?: string;
};

type ListSiteInput = {
  limit: number;
  offset: number;
  filter: SiteFilter;
};

type PagedSite = Paged<SiteList>;

type CreateSite = {
  code: string;
  name: string;
  timezone: string;
  enterpriseId: number | null;
};

type UpdateSite = Partial<CreateSite>;

export type {
  Site,
  SiteList,
  SiteFilter,
  ListSiteInput,
  PagedSite,
  CreateSite,
  UpdateSite,
  SiteEnrichedList,
  SiteEnriched,
};
