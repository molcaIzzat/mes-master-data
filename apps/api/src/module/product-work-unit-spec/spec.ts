import type { Paged } from "@molca/network";

type ProductSpec = {
  id: number;
  product: {
    id: number;
    code: string;
    name: string;
  } | null;
  workUnitId: number;
  uom: {
    id: number;
    code: string;
    name: string;
  } | null;
  idealRatePerHour: number;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductSpecList = Omit<ProductSpec, "updatedAt" | "createdAt" | "region">;

type ListProductSpecInput = {
  limit: number;
  offset: number;
};

type PagedProductSpec = Paged<ProductSpecList>;

type CreateProductSpec = {
  productId: number;
  workUnitId: number;
  uomId: number;
  idealRatePerHour: string;
};

type UpdateProductSpec = Omit<Partial<CreateProductSpec>, "workUnitId">;

export type {
  ProductSpec,
  ProductSpecList,
  ListProductSpecInput,
  PagedProductSpec,
  CreateProductSpec,
  UpdateProductSpec,
};
