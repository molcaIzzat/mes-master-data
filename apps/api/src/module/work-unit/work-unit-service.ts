import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateWorkUnit,
  WorkUnit,
  WorkUnitFilter,
  WorkUnitList,
  UpdateWorkUnit,
} from "./work-unit.js";
import type { WorkUnitReader, WorkUnitWriter } from "./work-unit-repository.js";

type PagedWorkUnitResult = PagedResult<WorkUnitList>;

type WorkUnitServiceDeps = {
  workUnitReaderRepository: WorkUnitReader;
  workUnitWriterRepository: WorkUnitWriter;
  logger?: Logger;
};

type WorkUnitSummaries = {
  id: number;
  code: string;
  name: string;
}[];

type TWorkUnitService = {
  findAll: (page: number, size: number, filter: WorkUnitFilter) => Promise<PagedWorkUnitResult>;
  findById: (id: number) => Promise<WorkUnit>;
  findSummariesByWorkCenterId: (workCenterId: number) => Promise<WorkUnitSummaries>;
  create: (input: CreateWorkUnit) => Promise<{ id: number }>;
  update: (id: number, input: UpdateWorkUnit) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class WorkUnitService implements TWorkUnitService {
  private workUnitReaderRepository: WorkUnitReader;
  private workUnitWriterRepository: WorkUnitWriter;
  private fallbackLogger: Logger;

  constructor({ workUnitReaderRepository, workUnitWriterRepository, logger }: WorkUnitServiceDeps) {
    this.workUnitReaderRepository = workUnitReaderRepository;
    this.workUnitWriterRepository = workUnitWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: WorkUnitFilter): Promise<PagedWorkUnitResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.workUnitReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<WorkUnit> {
    const workUnit = await this.workUnitReaderRepository.findById(id);
    if (!workUnit) throw new HTTPException(404, { message: "work unit not found" });
    return workUnit;
  }

  async findSummariesByWorkCenterId(workCenterId: number): Promise<WorkUnitSummaries> {
    return await this.workUnitReaderRepository.findSummariesByWorkCenterId(workCenterId);
  }

  async create(input: CreateWorkUnit): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "work_unit_create",
      {
        input,
      },
      () => this.workUnitWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateWorkUnit): Promise<{ id: number }> {
    const found = await this.workUnitReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "work unit not found" });
    const save = await withLog(
      this.logger,
      "work_unit_update",
      {
        id,
        input,
      },
      () => this.workUnitWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.workUnitReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "work unit not found" });
    await withLog(
      this.logger,
      "work_unit_delete",
      {
        id,
      },
      () => this.workUnitWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { WorkUnitService };
export type { PagedWorkUnitResult, TWorkUnitService };
