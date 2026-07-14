import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateWorkCenter,
  WorkCenter,
  WorkCenterFilter,
  WorkCenterList,
  UpdateWorkCenter,
} from "./work-center.js";
import type { WorkCenterReader, WorkCenterWriter } from "./work-center-repository.js";

type PagedWorkCenterResult = PagedResult<WorkCenterList>;

type WorkCenterServiceDeps = {
  workCenterReaderRepository: WorkCenterReader;
  workCenterWriterRepository: WorkCenterWriter;
  logger?: Logger;
};

type TWorkCenterService = {
  findAll: (page: number, size: number, filter: WorkCenterFilter) => Promise<PagedWorkCenterResult>;
  findById: (id: number) => Promise<WorkCenter>;
  create: (input: CreateWorkCenter) => Promise<{ id: number }>;
  update: (id: number, input: UpdateWorkCenter) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class WorkCenterService implements TWorkCenterService {
  private workCenterReaderRepository: WorkCenterReader;
  private workCenterWriterRepository: WorkCenterWriter;
  private fallbackLogger: Logger;

  constructor({
    workCenterReaderRepository,
    workCenterWriterRepository,
    logger,
  }: WorkCenterServiceDeps) {
    this.workCenterReaderRepository = workCenterReaderRepository;
    this.workCenterWriterRepository = workCenterWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: WorkCenterFilter,
  ): Promise<PagedWorkCenterResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.workCenterReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<WorkCenter> {
    const workCenter = await this.workCenterReaderRepository.findById(id);
    if (!workCenter) throw new HTTPException(404, { message: "work center not found" });
    return workCenter;
  }

  async create(input: CreateWorkCenter): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "work_center_create",
      {
        input,
      },
      () => this.workCenterWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateWorkCenter): Promise<{ id: number }> {
    const found = await this.workCenterReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "work center not found" });
    const save = await withLog(
      this.logger,
      "work_center_update",
      {
        id,
        input,
      },
      () => this.workCenterWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.workCenterReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "work center not found" });
    await withLog(
      this.logger,
      "work_center_delete",
      {
        id,
      },
      () => this.workCenterWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { WorkCenterService };
export type { PagedWorkCenterResult, TWorkCenterService };
