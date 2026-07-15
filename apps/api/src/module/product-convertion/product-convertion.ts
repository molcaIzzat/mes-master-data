type UpdateProductConvertion = {
  factorToBase?: number;
  uomId?: number;
  sortOrder?: number;
};

function toFormatString(patch: UpdateProductConvertion) {
  return {
    ...patch,
    factorToBase: patch.factorToBase ? String(patch.factorToBase) : undefined,
  };
}

export { toFormatString };
export type { UpdateProductConvertion };
