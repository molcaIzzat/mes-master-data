import type { Paged } from "@molca/network";

type DowntimeAction = {
  id: number;
  code: string;
  name: string;
  color: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type DowntimeActionList = Omit<DowntimeAction, "updatedAt">;

type DowntimeActionFilter = {
  q?: string;
};

type ListDowntimeActionInput = {
  limit: number;
  offset: number;
  filter: DowntimeActionFilter;
};

type PagedDowntimeAction = Paged<DowntimeActionList>;

type CreateDowntimeAction = {
  code: string;
  name: string;
  color: string;
};

type UpdateDowntimeAction = Partial<CreateDowntimeAction>;

export type {
  DowntimeAction,
  DowntimeActionList,
  DowntimeActionFilter,
  ListDowntimeActionInput,
  PagedDowntimeAction,
  CreateDowntimeAction,
  UpdateDowntimeAction,
};
