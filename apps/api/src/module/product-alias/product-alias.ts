import type { Paged } from "@molca/network";

type ProductAlias = {
  id: number;
  workUnitId: number;
  product: {
    id: number;
    code: string;
    name: string;
  } | null;
  equipment: {
    id: number;
    code: string;
    name: string;
  } | null;
  externalCode: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductAliasList = Omit<ProductAlias, "updatedAt" | "createdAt" | "region">;

type ListProductAliasInput = {
  limit: number;
  offset: number;
};

type PagedProductAlias = Paged<ProductAliasList>;

type CreateProductAlias = {
  productId: number;
  workUnitId: number;
  equipmentId: number;
  externalCode: string;
};

type UpdateProductAlias = Omit<Partial<CreateProductAlias>, "workUnitId">;

export type {
  ProductAlias,
  ProductAliasList,
  ListProductAliasInput,
  PagedProductAlias,
  CreateProductAlias,
  UpdateProductAlias,
};
