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

// Mirrors the core-api EquipmentList shape returned by GET /v1/equipments
// (only the fields the Equipment multi-select needs). `unit` is the work unit,
// surfaced in the option label.
type EquipmentListItem = {
  id: number;
  code: string;
  name: string;
  unit: { id: number; name: string; code: string } | null;
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

export type {
  AreaListItem,
  ClassListItem,
  CreateDowntimeReasonInput,
  CreateEquipmentInput,
  CreateProductInput,
  CreateProductPackage,
  CreateRejectReworkReasonInput,
  CreateWorkCenterInput,
  CreateWorkUnitInput,
  DowntimeReasonCategory,
  DowntimeReasonListItem,
  DowntimeReasonRef,
  EquipmentListItem,
  LevelConfigurationListItem,
  LevelEquipmentItem,
  LevelNodeRef,
  LevelWorkUnitItem,
  Me,
  PageMeta,
  ProductArea,
  ProductDetail,
  ProductLine,
  ProductListItem,
  ProductPackageDetail,
  RejectReworkReasonListItem,
  RejectReworkReasonRef,
  UomListItem,
  UpdateDowntimeReasonInput,
  UpdateProductInput,
  UpdateRejectReworkReasonInput,
  WebResponse,
  WorkCenterListItem,
};
