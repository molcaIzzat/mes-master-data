type Edge = {
  id: number;
  workCenterId: number;
  fromWorkUnitId: number;
  toWorkUnitId: number;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkUnitRef = {
  id: number;
  code: string;
  name: string;
};

// The list nests both endpoints: a flow only means anything to a reader as the
// pair of machines it connects, never as two ids.
type EdgeList = {
  id: number;
  workCenterId: number;
  from: WorkUnitRef | null;
  to: WorkUnitRef | null;
};

type CreateEdge = {
  workCenterId: number;
  fromWorkUnitId: number;
  toWorkUnitId: number;
};

// The work center comes from the path, so an edit can only move the endpoints.
type UpdateEdge = Omit<CreateEdge, "workCenterId">;

export type { Edge, EdgeList, CreateEdge, UpdateEdge, WorkUnitRef };
