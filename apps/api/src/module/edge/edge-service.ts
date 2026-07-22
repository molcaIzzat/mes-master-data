import { withLog, type Logger } from "@molca/utils";

import type { EdgeList, CreateEdge } from "./edge.js";
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

  async create(input: CreateEdge): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "edge_create",
      {
        input,
      },
      async () => {
        const workCenterId = input.workCenterId;
        const [workUnits, existingEdges] = await Promise.all([
          this.workUnitService.findSummariesByWorkCenterId(workCenterId),
          this.edgeReaderRepository.findAll(workCenterId),
        ]);

        const nodes = workUnits.map((wu) => ({ id: wu.id, code: wu.code }));
        const proposed = [
          ...existingEdges.map((e) => ({
            fromWorkUnitId: e.fromWorkUnitId,
            toWorkUnitId: e.toWorkUnitId,
          })),
          {
            fromWorkUnitId: input.fromWorkUnitId,
            toWorkUnitId: input.toWorkUnitId,
          },
        ];

        const result = this.validateGraph(nodes, proposed);
        if (!result.ok) {
          const endpointCodes = new Set(
            nodes
              .filter((n) => n.id === input.fromWorkUnitId || n.id === input.toWorkUnitId)
              .map((n) => n.code),
          );
          const relevant = result.errors.filter(
            (e) => e.code === "CYCLE" || e.workUnitCodes.some((code) => endpointCodes.has(code)),
          );
          if (relevant.length > 0) {
            throw new InvalidTopology({ errors: relevant });
          }
        }

        return await this.edgeWriterRepository.create(input);
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
