import type { Paged } from "@molca/network";

const LINE_CATEGORY = ["PACKAGE", "BULK"] as const;

type LineCategory = (typeof LINE_CATEGORY)[number];

type Line = {
  id: number;
  code: string;
  name: string;
  areaId: number;
  area: {
    id: number;
    name: string;
    displayName: string | null;
  } | null;
  category: LineCategory;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type LineList = Omit<Line, "updatedAt" | "area">;

type LineFilter = {
  q?: string;
  areaId?: number;
  category?: LineCategory;
};

type ListLineInput = {
  limit: number;
  offset: number;
  filter: LineFilter;
};

type PagedLine = Paged<LineList>;

type CreateLine = {
  code: string;
  name: string;
  areaId: number;
  category: LineCategory;
};

type UpdateLine = Partial<CreateLine>;

export { LINE_CATEGORY };
export type {
  LineCategory,
  Line,
  LineList,
  LineFilter,
  ListLineInput,
  PagedLine,
  CreateLine,
  UpdateLine,
};
