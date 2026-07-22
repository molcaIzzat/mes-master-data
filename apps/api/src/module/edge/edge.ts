type Edge = {
  id: number;
  workCenterId: number;
  fromWorkUnitId: number;
  toWorkUnitId: number;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type EdgeList = Omit<Edge, "createdAt" | "updatedAt" | "region">;

type CreateEdge = {
  workCenterId: number;
  fromWorkUnitId: number;
  toWorkUnitId: number;
};

export type { Edge, EdgeList, CreateEdge };
