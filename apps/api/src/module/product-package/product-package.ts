import type { ProductPackagingType } from "../product/product.js";

type UpdateProductPackage = {
  main?: boolean;
  sortOrder?: number;
  package?: ProductPackagingType;
  stdWeight?: number;
  minWeight?: number;
  maxWeight?: number;
  length?: number;
  width?: number;
  height?: number;
  vol?: number;
};

function toFormatString(patch: UpdateProductPackage) {
  return {
    ...patch,
    stdWeight: patch.stdWeight ? String(patch.stdWeight) : undefined,
    minWeight: patch.minWeight ? String(patch.minWeight) : undefined,
    maxWeight: patch.maxWeight ? String(patch.maxWeight) : undefined,
    length: patch.length ? String(patch.length) : undefined,
    width: patch.width ? String(patch.width) : undefined,
    height: patch.height ? String(patch.height) : undefined,
    vol: patch.vol ? String(patch.vol) : undefined,
  };
}

export { toFormatString };
export type { UpdateProductPackage };
