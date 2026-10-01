import type { LineSummary, LinePartialFetch } from "./line-dto.js";

type LineClientContract = {
  existsById(id: number): Promise<boolean>;
  getMany(ids: number[]): Promise<LinePartialFetch<LineSummary>>;
};

export type { LineClientContract };
