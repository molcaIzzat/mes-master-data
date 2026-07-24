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

// Mirrors the core-api EquipmentList shape returned by GET /v1/equipments
// (only the fields the Machine multi-select needs).
type EquipmentListItem = {
  id: number;
  code: string;
  name: string;
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

export type {
  AreaListItem,
  CreateDowntimeReasonInput,
  CreateProductInput,
  CreateProductPackage,
  DowntimeReasonCategory,
  DowntimeReasonListItem,
  DowntimeReasonRef,
  EquipmentListItem,
  Me,
  PageMeta,
  ProductArea,
  ProductDetail,
  ProductLine,
  ProductListItem,
  ProductPackageDetail,
  UomListItem,
  UpdateDowntimeReasonInput,
  UpdateProductInput,
  WebResponse,
  WorkCenterListItem,
};
