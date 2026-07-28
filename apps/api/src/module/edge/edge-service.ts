import { withLog, type Logger } from "@molca/utils";

import type { EdgeList, CreateEdge, UpdateEdge } from "./edge.js";
import type { EdgeReader, EdgeWriter } from "./edge-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { HTTPException } from "hono/http-exception";
import type { TWorkUnitService } from "../work-unit/work-unit-service.js";
import { InvalidTopology } from "./edge-errors.js";

type EdgeServiceDeps = {
  edgeReaderRepository: EdgeReader;
  edgeWriterRepository: EdgeWriter;
  workUnitService: TWorkUnitService;
  logger?: Logger;
};

type TEdgeService = {
  findAll: (workCenterId: number) => Promise<EdgeList[]>;
  create: (input: CreateEdge) => Promise<{ id: number }>;
  update: (workCenterId: number, id: number, input: UpdateEdge) => Promise<{ id: number }>;
  delete: (workCenterId: number, id: number) => Promise<string>;
};

type GraphNode = {
  id: number;
  code: string;
};

type GraphEdge = {
  fromWorkUnitId: number;
  toWorkUnitId: number;
};

type GraphErrorCode = "CYCLE" | "WEIGHTER_NO_UPSTREAM" | "DANGLING_EDGE";

type GraphError = {
  code: GraphErrorCode;
  message: string;
  /** Work unit codes involved, for work-unit-level UI detail. */
  workUnitCodes: string[];
};

type GraphValidationResult = {
  ok: boolean;
  errors: GraphError[];
};

// Kahn's algorithm: strip machines that have no upstream left, over and over. A
// DAG always has such a machine, so whatever survives sits on a cycle. The
// survivors are then walked forward to recover one concrete loop to name.
function findCycle(nodes: GraphNode[], edges: GraphEdge[]): number[] | null {
  const outgoing = new Map<number, number[]>();
  const inDegree = new Map<number, number>();
  for (const node of nodes) {
    outgoing.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    outgoing.get(edge.fromWorkUnitId)?.push(edge.toWorkUnitId);
    inDegree.set(edge.toWorkUnitId, (inDegree.get(edge.toWorkUnitId) ?? 0) + 1);
  }

  const queue = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
  const settled = new Set<number>();
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    settled.add(id);
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  const residual = nodes.map((node) => node.id).filter((id) => !settled.has(id));
  if (residual.length === 0) return null;

  // Machines merely downstream of a loop also survive, so every survivor is
  // tried as a starting point until the loop itself is entered.
  const survivors = new Set(residual);
  for (const start of residual) {
    const path: number[] = [];
    const onPath = new Set<number>();

    const walk = (id: number): number[] | null => {
      path.push(id);
      onPath.add(id);
      for (const next of outgoing.get(id) ?? []) {
        if (!survivors.has(next)) continue;
        if (onPath.has(next)) return path.slice(path.indexOf(next));
        const found = walk(next);
        if (found) return found;
      }
      path.pop();
      onPath.delete(id);
      return null;
    };

    const found = walk(start);
    if (found) return found;
  }

  return residual;
}

// Judges the whole proposed graph of a line. Exported for its own tests; the
// service reaches it through `assertTopology`.
function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphValidationResult {
  const codeById = new Map(nodes.map((node) => [node.id, node.code]));
  const errors: GraphError[] = [];

  // An endpoint that is not a machine of this line cannot be walked, so those
  // edges are reported and then left out of the cycle search.
  const walkable: GraphEdge[] = [];
  for (const edge of edges) {
    const endpoints = [edge.fromWorkUnitId, edge.toWorkUnitId];
    if (endpoints.every((id) => codeById.has(id))) {
      walkable.push(edge);
      continue;
    }

    errors.push({
      code: "DANGLING_EDGE",
      message: "this connection points at a machine that does not belong to this line",
      workUnitCodes: endpoints.flatMap((id) => {
        const code = codeById.get(id);
        return code === undefined ? [] : [code];
      }),
    });
  }

  const cycle = findCycle(nodes, walkable);
  if (cycle) {
    const codes = cycle.map((id) => codeById.get(id) ?? String(id));
    errors.push({
      code: "CYCLE",
      message: `this connection would create a loop: ${[...codes, codes[0]].join(" -> ")}`,
      workUnitCodes: codes,
    });
  }

  // WEIGHTER_NO_UPSTREAM stays unimplemented on purpose: it needs a notion of
  // "weigher" machines that the master data does not carry yet.

  return { ok: errors.length === 0, errors };
}

class EdgeService implements TEdgeService {
  private edgeReaderRepository: EdgeReader;
  private edgeWriterRepository: EdgeWriter;
  private workUnitService: TWorkUnitService;
  private fallbackLogger: Logger;

  constructor({
    edgeReaderRepository,
    edgeWriterRepository,
    workUnitService,
    logger,
  }: EdgeServiceDeps) {
    this.edgeReaderRepository = edgeReaderRepository;
    this.edgeWriterRepository = edgeWriterRepository;
    this.workUnitService = workUnitService;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(workCenterId: number): Promise<EdgeList[]> {
    return await this.edgeReaderRepository.findAll(workCenterId);
  }

  // Checks the graph the line would have once `edge` is applied. `replacingId`
  // is the edge being edited, which drops out of the existing set so it is not
  // weighed against its own replacement.
  private async assertTopology(
    workCenterId: number,
    edge: GraphEdge,
    replacingId?: number,
  ): Promise<void> {
    const [workUnits, existingEdges] = await Promise.all([
      this.workUnitService.findSummariesByWorkCenterId(workCenterId),
      this.edgeReaderRepository.findAll(workCenterId),
    ]);

    const nodes = workUnits.map((wu) => ({ id: wu.id, code: wu.code }));
    const proposed = [
      ...existingEdges
        .filter((e) => e.id !== replacingId)
        .flatMap((e) =>
          e.from && e.to ? [{ fromWorkUnitId: e.from.id, toWorkUnitId: e.to.id }] : [],
        ),
      edge,
    ];

    const result = validateGraph(nodes, proposed);
    if (result.ok) return;

    const endpointCodes = new Set(
      nodes
        .filter((n) => n.id === edge.fromWorkUnitId || n.id === edge.toWorkUnitId)
        .map((n) => n.code),
    );
    // Both endpoints off the line leaves nothing to match on by code, so that
    // case is recognised up front rather than slipping through the filter.
    const proposedIsDangling = endpointCodes.size < 2;
    const relevant = result.errors.filter(
      (e) =>
        e.code === "CYCLE" ||
        (e.code === "DANGLING_EDGE" && proposedIsDangling) ||
        e.workUnitCodes.some((code) => endpointCodes.has(code)),
    );
    if (relevant.length > 0) {
      throw new InvalidTopology({ errors: relevant });
    }
  }

  async create(input: CreateEdge): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "edge_create",
      {
        input,
      },
      async () => {
        await this.assertTopology(input.workCenterId, {
          fromWorkUnitId: input.fromWorkUnitId,
          toWorkUnitId: input.toWorkUnitId,
        });

        return await this.edgeWriterRepository.create(input);
      },
    );

    return save;
  }

  async update(workCenterId: number, id: number, input: UpdateEdge): Promise<{ id: number }> {
    const exist = await this.edgeReaderRepository.existById(workCenterId, id);
    if (!exist) throw new HTTPException(404, { message: "edge not found" });

    const save = await withLog(
      this.logger,
      "edge_update",
      {
        edgeId: id,
        input,
      },
      async () => {
        await this.assertTopology(workCenterId, input, id);

        return await this.edgeWriterRepository.update(workCenterId, id, input);
      },
    );

    return save;
  }

  async delete(workCenterId: number, id: number): Promise<string> {
    const exist = await this.edgeReaderRepository.existById(workCenterId, id);
    if (!exist) throw new HTTPException(404, { message: "edge not found" });
    await withLog(
      this.logger,
      "edge_delete",
      {
        edgeId: id,
      },
      () => this.edgeWriterRepository.delete(workCenterId, id),
    );

    return "ok";
  }
}

export { EdgeService, validateGraph };
export type { TEdgeService, GraphEdge, GraphError, GraphNode, GraphValidationResult };
