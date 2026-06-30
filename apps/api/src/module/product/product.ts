import type { Paged } from "@molca/network";

const PRODUCT_CYCLE_TIME_UNIT = [
  "BAG_PER_MINUTE",
  "SHOT_PER_MINUTE",
  "SAK_PER_MINUTE",
  "PCS_PER_MINUTE",
] as const;

const PRODUCT_PACKAGING_TYPE = ["BAG", "SHOT", "CALENDER", "INNER", "CARTON", "SAK"] as const;

type ProductCycleTimeUnit = (typeof PRODUCT_CYCLE_TIME_UNIT)[number];
type ProductPackagingType = (typeof PRODUCT_PACKAGING_TYPE)[number];

type Product = {
  id: number;
  name: string;
  code: string;
  region: string;
  area: {
    id: number;
    displayName: string | null;
  } | null;
  lines: {
    id: number;
    lineName: string;
  }[];
  cycleTime: number;
  cycleTimeUnit: string;
  price: number | null;
  cost: number | null;
  packages: {
    id: number;
    main: boolean;
    package: string;
    stdWeight: string;
    minWeight: string;
    maxWeight: string;
  }[];
  convertions: {
    id: number;
    value: string;
    unit: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

type ProductList = Pick<Product, "id" | "code" | "name" | "region" | "area" | "lines">;

type ProductFilter = {
  q?: string;
  areaId?: number;
};

type ListProductInput = {
  limit: number;
  offset: number;
  filter: ProductFilter;
};

type PagedProduct = Paged<ProductList>;

type ProductPackage = {
  main: boolean;
  sortOrder: number;
  package: ProductPackagingType;
  stdWeight: number;
  minWeight: number;
  maxWeight: number;
  length: number;
  width: number;
  height: number;
  vol: number;
};

type ProductConvertion = {
  value: number;
  unit: string;
  sortOrder: number;
};

type OwnerCreateProduct = {
  code: string;
  name: string;
  areaId: number;
  cycleTime: number;
  cycleTimeUnit: ProductCycleTimeUnit;
  price: number;
  cost: number;
};

type CreateProduct = OwnerCreateProduct & {
  lineIds: number[];
  packages: ProductPackage[];
  convertions: ProductConvertion[];
};

type UpdateProduct = Partial<OwnerCreateProduct> & {
  lineIds?: number[];
  packages?: (ProductPackage & { id: number })[];
  convertions?: (ProductConvertion & { id: number })[];
};

export { PRODUCT_CYCLE_TIME_UNIT, PRODUCT_PACKAGING_TYPE };
export type {
  ProductCycleTimeUnit,
  ProductPackagingType,
  Product,
  ProductList,
  ProductFilter,
  ListProductInput,
  PagedProduct,
  ProductPackage,
  ProductConvertion,
  CreateProduct,
  UpdateProduct,
};
