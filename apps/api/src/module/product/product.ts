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
  idealRatePerHour: number | null;
  price: number | null;
  cost: number | null;
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
  factorToBase: number;
  sortOrder: number;
  stdWeight: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  vol: number | null;
};

type OwnerCreateProduct = {
  code: string;
  name: string;
  areaId: number;
  baseUomId: number;
  idealRatePerHour: number | null;
  price: string | null;
  cost: string | null;
};

type CreateProduct = OwnerCreateProduct & {
  workCenterIds: number[];
  packages: ProductPackage[];
};

type UpdateProduct = Partial<OwnerCreateProduct> & {
  workCenterIds?: number[];
  packages?: (ProductPackage & { id: number })[];
};

export type {
  Product,
  ProductList,
  ProductFilter,
  ListProductInput,
  PagedProduct,
  ProductPackage,
  CreateProduct,
  UpdateProduct,
};
