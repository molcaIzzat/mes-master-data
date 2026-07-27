// Shapes mirrored from the BFF / core-api responses.

type Me = {
  sub: string;
  preferredUsername: string;
  email: string;
};

type PageMeta = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

// core-api WebResponse envelope.
type WebResponse<T> = {
  data: T | null;
  meta?: PageMeta;
  error: string | null;
};

// A production line associated with a product (the API's "workCenters").
type ProductLine = {
  id: number;
  name: string;
};

type ProductArea = {
  id: number;
  code: string;
  name: string;
};

// Mirrors the core-api ProductList shape returned by GET /v1/products.
type ProductListItem = {
  id: number;
  code: string;
  name: string;
  region: string;
  area: ProductArea | null;
  workCenters: ProductLine[];
};

// Downtime reason category enum (mirrors core-api DOWNTIME_REASON_CATEGORY).
type DowntimeReasonCategory = "PLANNED" | "UNPLANNED" | "SMALL_STOP";

// Shared summary shape for a downtime reason's related area/line/equipment.
type DowntimeReasonRef = {
  id: number;
  name: string;
  code: string;
};

// Mirrors the core-api DowntimeReasonEnrichedList shape returned by
// GET /v1/downtime-reasons. `workCenters` are lines, `equipments` are machines.
type DowntimeReasonListItem = {
  id: number;
  name: string;
  code: string;
  category: DowntimeReasonCategory;
  areas: DowntimeReasonRef[];
  workCenters: DowntimeReasonRef[];
  equipments: DowntimeReasonRef[];
  region: string;
  createdAt: string;
};

// POST /v1/downtime-reasons request body. Area is single in the UI but the API
// takes an array, so it is sent as a one-element `areaIds`.
type CreateDowntimeReasonInput = {
  code: string;
  name: string;
  category: DowntimeReasonCategory;
  areaIds: number[];
  workCenterIds: number[];
  equipmentIds: number[];
};

// PUT /v1/downtime-reasons/:id body — same shape as create.
type UpdateDowntimeReasonInput = CreateDowntimeReasonInput;

// Shared summary shape for a reject/rework reason's related area/line/equipment.
type RejectReworkReasonRef = {
  id: number;
  name: string;
  code: string;
};

// Mirrors the core-api RejectReasonEnrichedList shape returned by
// GET /v1/reject-reasons. There is no category field. `workCenters` are lines,
// `equipments` are machines.
type RejectReworkReasonListItem = {
  id: number;
  name: string;
  code: string;
  areas: RejectReworkReasonRef[];
  workCenters: RejectReworkReasonRef[];
  equipments: RejectReworkReasonRef[];
  region: string;
  createdAt: string;
};

// POST /v1/reject-reasons request body. Area is single in the UI but the API
// takes an array, so it is sent as a one-element `areaIds`.
type CreateRejectReworkReasonInput = {
  code: string;
  name: string;
  areaIds: number[];
  workCenterIds: number[];
  equipmentIds: number[];
};

// PUT /v1/reject-reasons/:id body — same shape as create.
type UpdateRejectReworkReasonInput = CreateRejectReworkReasonInput;

// Mirrors the core-api EquipmentList shape returned by GET /v1/equipments.
// `unit` is the work unit, surfaced in the option label; `class` and
// `productSignalTag` are columns of the machine detail page's Equipment table.
type EquipmentListItem = {
  id: number;
  code: string;
  name: string;
  unit: { id: number; name: string; code: string } | null;
  class: LevelNodeRef | null;
  productSignalTag: string;
};

// Mirrors the core-api AreaList shape returned by GET /v1/areas.
type AreaListItem = {
  id: number;
  siteId: number;
  name: string;
  code: string;
  region: string;
};

// Mirrors the core-api UomList shape returned by GET /v1/uoms.
type UomListItem = {
  id: number;
  code: string;
  name: string;
};

// Shared shape of the three class/category reference lists:
// GET /v1/work-center-classes, /v1/work-unit-classes, /v1/equipment-classes.
type ClassListItem = {
  id: number;
  code: string;
  name: string;
};

// POST /v1/work-centers body. `type`, `oeeMode` and `idealRatePerHour` are not
// exposed in the form -- see LINE_DEFAULTS in level-configuration-schema.
type CreateWorkCenterInput = {
  code: string;
  name: string;
  areaId: number;
  type: string;
  oeeMode: string;
  workCenterClassId: number | null;
  idealRatePerHour: number | null;
};

// POST /v1/work-units body. Everything the form does not ask for comes from
// MACHINE_DEFAULTS.
type CreateWorkUnitInput = {
  code: string;
  name: string;
  workCenterId: number;
  workUnitClassId: number | null;
  isOeeRelevant: boolean;
  isAcquirable: boolean;
  telemetryTags: Record<string, string> | null;
  type: string;
  position: { x: number; y: number };
};

// POST /v1/equipments body -- every field is surfaced in the form.
type CreateEquipmentInput = {
  code: string;
  name: string;
  workUnitId: number;
  equipmentClassId: number | null;
  productSignalTag: string;
};

// Mirrors the core-api WorkCenterList shape returned by GET /v1/work-centers.
type WorkCenterListItem = {
  id: number;
  code: string;
  name: string;
  area: ProductArea | null;
};

// POST /v1/products request body. `length`/`width`/`height`/`vol` are required
// positive by the API but not surfaced in the form (sent as 1).
type CreateProductPackage = {
  main: boolean;
  uomId: number;
  sortOrder: number;
  stdWeight: number;
  minWeight: number;
  maxWeight: number;
  length: number;
  width: number;
  height: number;
  vol: number;
  factorToBase: number;
};

type CreateProductInput = {
  code: string;
  name: string;
  areaId: number;
  baseUomId: number;
  idealRatePerHour: number | null;
  price: number | null;
  cost: number | null;
  workCenterIds: number[];
  packages: CreateProductPackage[];
};

// PUT /v1/products/:id body — the create body where every package also carries
// its DB `id` (0 for newly added rows; the API diffs packages by id).
type UpdateProductInput = Omit<CreateProductInput, "packages"> & {
  packages: (CreateProductPackage & { id: number })[];
};

// A single package as returned by GET /v1/products/:id (nested `uom`, no
// dimensions/uomId).
type ProductPackageDetail = {
  id: number;
  main: boolean;
  sortOrder: number;
  uom: ProductArea | null;
  stdWeight: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  factorToBase: number;
};

// Mirrors the core-api Product shape returned by GET /v1/products/:id.
type ProductDetail = {
  id: number;
  code: string;
  name: string;
  region: string;
  area: ProductArea | null;
  baseUom: ProductArea | null;
  workCenters: ProductLine[];
  idealRatePerHour: number | null;
  price: number | null;
  cost: number | null;
  packages: ProductPackageDetail[];
};

// Mirrors the core-api LevelNode shape: every node in the level-configuration
// tree is rendered from just id/code/name.
type LevelNodeRef = {
  id: number;
  code: string;
  name: string;
};

// `class` / `productSignalTag` are not shown in the table; they ride along so the
// edit dialogs can prefill straight from the row.
type LevelEquipmentItem = LevelNodeRef & {
  class: LevelNodeRef | null;
  productSignalTag: string;
};

type LevelWorkUnitItem = LevelNodeRef & {
  class: LevelNodeRef | null;
  equipments: LevelEquipmentItem[];
};

// Mirrors the core-api LevelLine shape returned by GET /v1/level-configurations.
// `class` is what the table shows in the Category column.
type LevelConfigurationListItem = LevelNodeRef & {
  area: LevelNodeRef | null;
  class: LevelNodeRef | null;
  workUnits: LevelWorkUnitItem[];
};

// Mirrors the core-api WorkUnit shape returned by GET /v1/work-units/:id. The
// machine detail page reads the parent line off `workCenter` and the Machine
// Category off `class`.
type WorkUnitDetail = LevelNodeRef & {
  workCenter: LevelNodeRef | null;
  class: LevelNodeRef | null;
};

// Mirrors the core-api WorkUnitList shape returned by GET /v1/work-units
// (only the fields the machine selects need).
type WorkUnitListItem = LevelNodeRef & {
  class: LevelNodeRef | null;
};

// Mirrors the core-api EdgeList shape returned by
// GET /v1/work-centers/:id/edges: one machine-to-machine flow on a line, with
// both endpoints resolved.
type EdgeListItem = {
  id: number;
  workCenterId: number;
  from: LevelNodeRef | null;
  to: LevelNodeRef | null;
};

// POST/PUT body for a flow. The line comes from the path.
type CreateEdgeInput = {
  fromWorkUnitId: number;
  toWorkUnitId: number;
};

// Mirrors the core-api WorkCenter shape returned by GET /v1/work-centers/:id.
// Supplies the Area Name and Line Category of the machine's line, neither of
// which the work unit itself carries.
type WorkCenterDetail = LevelNodeRef & {
  area: LevelNodeRef | null;
  class: LevelNodeRef | null;
};

// Mirrors ProductSpecList from GET /v1/work-units/:id/product-specs.
// `idealRatePerHour` is what the UI labels "Cycle Time".
type ProductSpecListItem = {
  id: number;
  workUnitId: number;
  product: LevelNodeRef | null;
  uom: LevelNodeRef | null;
  idealRatePerHour: number;
};

// Mirrors ProductAliasList from GET /v1/work-units/:id/product-aliases.
type ProductAliasListItem = {
  id: number;
  workUnitId: number;
  product: LevelNodeRef | null;
  equipment: LevelNodeRef | null;
  externalCode: string;
};

// Mirrors the core-api COUNT_ROLE / COUNT_SOURCE enums.
const COUNT_ROLES = [
  "infeed",
  "good_output",
  "reject",
  "good_weight",
  "reject_weight",
  "total_weight",
] as const;
const COUNT_SOURCES = ["plc", "manual"] as const;

type CountRole = (typeof COUNT_ROLES)[number];
type CountSource = (typeof COUNT_SOURCES)[number];

// Mirrors CountPointList from GET /v1/work-units/:id/count-points.
type CountPointListItem = {
  id: number;
  workUnitId: number;
  equipment: LevelNodeRef | null;
  uom: LevelNodeRef | null;
  role: CountRole;
  source: CountSource;
  sourceTag: string;
};

// POST/PUT bodies for the three machine children. The work unit comes from the
// path, so none of them carries it.
type CreateProductSpecInput = {
  productId: number;
  uomId: number;
  idealRatePerHour: number;
};

type CreateProductAliasInput = {
  productId: number;
  equipmentId: number;
  externalCode: string;
};

type CreateCountPointInput = {
  equipmentId: number | null;
  uomId: number;
  role: CountRole;
  source: CountSource;
  sourceTag: string;
};

export { COUNT_ROLES, COUNT_SOURCES };
export type {
  AreaListItem,
  ClassListItem,
  CountPointListItem,
  CountRole,
  CountSource,
  CreateCountPointInput,
  CreateDowntimeReasonInput,
  CreateEdgeInput,
  CreateEquipmentInput,
  CreateProductAliasInput,
  CreateProductInput,
  CreateProductPackage,
  CreateProductSpecInput,
  CreateRejectReworkReasonInput,
  CreateWorkCenterInput,
  CreateWorkUnitInput,
  DowntimeReasonCategory,
  DowntimeReasonListItem,
  DowntimeReasonRef,
  EdgeListItem,
  EquipmentListItem,
  LevelConfigurationListItem,
  LevelEquipmentItem,
  LevelNodeRef,
  LevelWorkUnitItem,
  Me,
  PageMeta,
  ProductAliasListItem,
  ProductArea,
  ProductDetail,
  ProductLine,
  ProductListItem,
  ProductPackageDetail,
  ProductSpecListItem,
  RejectReworkReasonListItem,
  RejectReworkReasonRef,
  UomListItem,
  UpdateDowntimeReasonInput,
  UpdateProductInput,
  UpdateRejectReworkReasonInput,
  WebResponse,
  WorkCenterDetail,
  WorkCenterListItem,
  WorkUnitDetail,
  WorkUnitListItem,
};
