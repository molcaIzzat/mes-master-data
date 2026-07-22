import type { Paged } from "@molca/network";

const COUNT_ROLE = [
  "infeed",
  "good_output",
  "reject",
  "good_weight",
  "reject_weight",
  "total_weight",
] as const;
const COUNT_SOURCE = ["plc", "manual"] as const;

type CountRole = (typeof COUNT_ROLE)[number];
type CountSource = (typeof COUNT_SOURCE)[number];

type CountPoint = {
  id: number;
  workUnitId: number;
  equipment: {
    id: number;
    code: string;
    name: string;
  } | null;
  role: CountRole;
  uom: {
    id: number;
    code: string;
    name: string;
  } | null;
  source: CountSource;
  sourceTag: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type CountPointList = Omit<CountPoint, "updatedAt" | "createdAt" | "region">;

type ListCountPointInput = {
  limit: number;
  offset: number;
};

type PagedCountPoint = Paged<CountPointList>;

type CreateCountPoint = {
  workUnitId: number;
  equipmentId: number | null;
  role: CountRole;
  uomId: number;
  source: CountSource;
  sourceTag: string;
};

type UpdateCountPoint = Omit<Partial<CreateCountPoint>, "workUnitId">;

export { COUNT_ROLE, COUNT_SOURCE };
export type {
  CountSource,
  CountRole,
  CountPoint,
  CountPointList,
  ListCountPointInput,
  PagedCountPoint,
  CreateCountPoint,
  UpdateCountPoint,
};
