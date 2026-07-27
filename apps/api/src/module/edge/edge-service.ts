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

  private validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphValidationResult {
    //TODO: Implement function
    console.log({ nodes, edges });
    return { ok: true, errors: [] };
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

    const result = this.validateGraph(nodes, proposed);
    if (result.ok) return;

    const endpointCodes = new Set(
      nodes
        .filter((n) => n.id === edge.fromWorkUnitId || n.id === edge.toWorkUnitId)
        .map((n) => n.code),
    );
    const relevant = result.errors.filter(
      (e) => e.code === "CYCLE" || e.workUnitCodes.some((code) => endpointCodes.has(code)),
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

export { EdgeService };
export type { TEdgeService };
