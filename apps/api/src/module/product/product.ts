import type { Paged } from "@molca/network";

type Product = {
  id: number;
  code: string;
  name: string;
  area: {
    id: number;
    code: string;
    name: string;
  } | null;
  baseUom: {
    id: number;
    code: string;
    name: string;
  } | null;
  workCenters: {
    id: number;
    name: string;
  }[];
  idealRatePerHour: string | null;
  price: string | null;
  cost: string | null;
  packages: {
    id: number;
    main: boolean;
    sortOrder: number;
    uom: {
      id: number;
      code: string;
      name: string;
    } | null;
    stdWeight: number | null;
    minWeight: number | null;
    maxWeight: number | null;
  }[];
  convertions: {
    id: number;
    sortOrder: number;
    uom: {
      id: number;
      code: string;
      name: string;
    } | null;
    factorToBase: number;
  }[];
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductList = Pick<Product, "id" | "code" | "name" | "region" | "area" | "workCenters">;

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
  uomId: number;
  sortOrder: number;
  stdWeight: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  vol: number | null;
};

type ProductConvertion = {
  uomId: number;
  sortOrder: number;
  factorToBase: number;
};

type OwnerCreateProduct = {
  code: string;
  name: string;
  areaId: number;
  baseUomId: number;
  idealRatePerHour: string | null;
  price: string | null;
  cost: string | null;
};

type CreateProduct = OwnerCreateProduct & {
  workCenterIds: number[];
  packages: ProductPackage[];
  convertions: ProductConvertion[];
};

type UpdateProduct = Partial<OwnerCreateProduct> & {
  workCenterIds?: number[];
  packages?: (ProductPackage & { id: number })[];
  convertions?: (ProductConvertion & { id: number })[];
};

export type {
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
