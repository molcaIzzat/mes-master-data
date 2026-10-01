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

// --- bulk import -------------------------------------------------------------

// The spreadsheet columns, verbatim. Every field arrives as the raw cell text:
// the ids behind the codes and the enum behind the label are resolved during
// import so a bad value can be reported against the row it came from.
type ImportCountPointRow = {
  equipmentCode: string;
  unitCode: string;
  role: string;
  source: string;
  sourceTag: string;
};

const IMPORT_COLUMN = ["Equipment Code", "Unit Code", "Role", "Source", "Source Tag"] as const;

type ImportColumn = (typeof IMPORT_COLUMN)[number];

// One reason one cell was rejected. `row` is 1-based over the data rows, so it
// lines up with what the user sees in Excel once the header is discounted.
type ImportCountPointIssue = {
  row: number;
  column: ImportColumn;
  value: string;
  message: string;
};

type ImportCountPointResult = {
  total: number;
  created: number;
  skipped: number;
};

// Files are written by people, so both the stored value and the label the UI
// shows for it are accepted. Keys are lowercased at lookup time.
const ROLE_ALIASES: Record<string, CountRole> = {
  infeed: "infeed",
  "good output": "good_output",
  good_output: "good_output",
  reject: "reject",
  "good weight": "good_weight",
  good_weight: "good_weight",
  "reject weight": "reject_weight",
  reject_weight: "reject_weight",
  "total weight": "total_weight",
  total_weight: "total_weight",
};

const SOURCE_ALIASES: Record<string, CountSource> = {
  plc: "plc",
  manual: "manual",
};

const ROLE_LABELS = "Infeed, Good Output, Reject, Good Weight, Reject Weight, Total Weight";
const SOURCE_LABELS = "PLC, Manual";

function parseCountRole(value: string): CountRole | undefined {
  return ROLE_ALIASES[value.trim().toLowerCase()];
}

function parseCountSource(value: string): CountSource | undefined {
  return SOURCE_ALIASES[value.trim().toLowerCase()];
}

export {
  COUNT_ROLE,
  COUNT_SOURCE,
  IMPORT_COLUMN,
  ROLE_LABELS,
  SOURCE_LABELS,
  parseCountRole,
  parseCountSource,
};
export type {
  CountSource,
  CountRole,
  CountPoint,
  CountPointList,
  ListCountPointInput,
  PagedCountPoint,
  CreateCountPoint,
  UpdateCountPoint,
  ImportColumn,
  ImportCountPointRow,
  ImportCountPointIssue,
  ImportCountPointResult,
};
