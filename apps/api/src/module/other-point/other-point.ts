import type { Paged } from "@molca/network";

// A count point says how many; an other point says why. The tag itself names
// the reason -- `MITSUM-1:Film_Position_Motor_Error` -- so the ETL can attribute
// a stop or a scrapped unit to the signal that raised it, and aggregate how
// often each one fired and for how long.
const OTHER_ROLE = ["downtime", "reject"] as const;

const OTHER_DATA_TYPE = [
  "boolean",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "float",
  "double",
  "string",
] as const;

type OtherRole = (typeof OTHER_ROLE)[number];
type OtherDataType = (typeof OTHER_DATA_TYPE)[number];

type OtherPoint = {
  id: number;
  workUnitId: number;
  equipment: {
    id: number;
    code: string;
    name: string;
  } | null;
  role: OtherRole;
  dataType: OtherDataType;
  sourceTag: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type OtherPointList = Omit<OtherPoint, "updatedAt" | "createdAt" | "region">;

type ListOtherPointInput = {
  limit: number;
  offset: number;
};

type PagedOtherPoint = Paged<OtherPointList>;

type CreateOtherPoint = {
  workUnitId: number;
  equipmentId: number | null;
  role: OtherRole;
  dataType: OtherDataType;
  sourceTag: string;
};

type UpdateOtherPoint = Omit<Partial<CreateOtherPoint>, "workUnitId">;

// --- bulk import -------------------------------------------------------------

// The spreadsheet columns, verbatim. Every field arrives as the raw cell text:
// the id behind the code and the enums behind the labels are resolved during
// import so a bad value can be reported against the row it came from.
type ImportOtherPointRow = {
  equipmentCode: string;
  role: string;
  dataType: string;
  sourceTag: string;
};

const IMPORT_COLUMN = ["Equipment Code", "Role", "Data Type", "Source Tag"] as const;

type ImportColumn = (typeof IMPORT_COLUMN)[number];

// One reason one cell was rejected. `row` is 1-based over the data rows, so it
// lines up with what the user sees in Excel once the header is discounted.
type ImportOtherPointIssue = {
  row: number;
  column: ImportColumn;
  value: string;
  message: string;
};

type ImportOtherPointResult = {
  total: number;
  created: number;
  skipped: number;
};

// Files are written by people, so both the stored value and the label the UI
// shows for it are accepted. Keys are lowercased at lookup time.
const ROLE_ALIASES: Record<string, OtherRole> = {
  downtime: "downtime",
  "downtime reason": "downtime",
  reject: "reject",
  "reject reason": "reject",
};

// PLC vendors spell the same width half a dozen ways; the aliases cover what
// turns up in an exported tag list rather than only the stored value.
const DATA_TYPE_ALIASES: Record<string, OtherDataType> = {
  boolean: "boolean",
  bool: "boolean",
  bit: "boolean",
  int16: "int16",
  int: "int16",
  short: "int16",
  uint16: "uint16",
  word: "uint16",
  int32: "int32",
  dint: "int32",
  uint32: "uint32",
  dword: "uint32",
  int64: "int64",
  lint: "int64",
  uint64: "uint64",
  lword: "uint64",
  float: "float",
  real: "float",
  float32: "float",
  double: "double",
  lreal: "double",
  float64: "double",
  string: "string",
  text: "string",
};

const ROLE_LABELS = "Downtime, Reject";
const DATA_TYPE_LABELS = OTHER_DATA_TYPE.join(", ");

function parseOtherRole(value: string): OtherRole | undefined {
  return ROLE_ALIASES[value.trim().toLowerCase()];
}

function parseOtherDataType(value: string): OtherDataType | undefined {
  return DATA_TYPE_ALIASES[value.trim().toLowerCase()];
}

export {
  OTHER_ROLE,
  OTHER_DATA_TYPE,
  IMPORT_COLUMN,
  ROLE_LABELS,
  DATA_TYPE_LABELS,
  parseOtherRole,
  parseOtherDataType,
};
export type {
  OtherRole,
  OtherDataType,
  OtherPoint,
  OtherPointList,
  ListOtherPointInput,
  PagedOtherPoint,
  CreateOtherPoint,
  UpdateOtherPoint,
  ImportColumn,
  ImportOtherPointRow,
  ImportOtherPointIssue,
  ImportOtherPointResult,
};
