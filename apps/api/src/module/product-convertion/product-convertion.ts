type UpdateProductConvertion = {
  value?: number;
  unit?: string;
  sortOrder?: number;
};

function toFormatString(patch: UpdateProductConvertion) {
  return {
    ...patch,
    value: patch.value ? String(patch.value) : undefined,
  };
}

export { toFormatString };
export type { UpdateProductConvertion };
