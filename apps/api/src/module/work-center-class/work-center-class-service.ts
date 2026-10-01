import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateWorkCenterClass,
  WorkCenterClass,
  WorkCenterClassFilter,
  WorkCenterClassList,
  UpdateWorkCenterClass,
} from "./work-center-class.js";
import type {
  WorkCenterClassReader,
  WorkCenterClassWriter,
} from "./work-center-class-repository.js";

type PagedWorkCenterClassResult = PagedResult<WorkCenterClassList>;

type WorkCenterClassServiceDeps = {
  workCenterClassReaderRepository: WorkCenterClassReader;
  workCenterClassWriterRepository: WorkCenterClassWriter;
  logger?: Logger;
};

type TWorkCenterClassService = {
  findAll: (
    page: number,
    size: number,
    filter: WorkCenterClassFilter,
  ) => Promise<PagedWorkCenterClassResult>;
  findById: (id: number) => Promise<WorkCenterClass>;
  create: (input: CreateWorkCenterClass) => Promise<{ id: number }>;
  update: (id: number, input: UpdateWorkCenterClass) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class WorkCenterClassService implements TWorkCenterClassService {
  private workCenterClassReaderRepository: WorkCenterClassReader;
  private workCenterClassWriterRepository: WorkCenterClassWriter;
  private fallbackLogger: Logger;

  constructor({
    workCenterClassReaderRepository,
    workCenterClassWriterRepository,
    logger,
  }: WorkCenterClassServiceDeps) {
    this.workCenterClassReaderRepository = workCenterClassReaderRepository;
    this.workCenterClassWriterRepository = workCenterClassWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: WorkCenterClassFilter,
  ): Promise<PagedWorkCenterClassResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.workCenterClassReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<WorkCenterClass> {
    const workCenterClass = await this.workCenterClassReaderRepository.findById(id);
    if (!workCenterClass) throw new HTTPException(404, { message: "class not found" });
    return workCenterClass;
  }

  async create(input: CreateWorkCenterClass): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "work_center_class_create",
      {
        input,
      },
      () => this.workCenterClassWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateWorkCenterClass): Promise<{ id: number }> {
    const found = await this.workCenterClassReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "class not found" });
    const save = await withLog(
      this.logger,
      "work_center_class_update",
      {
        id,
        input,
      },
      () => this.workCenterClassWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.workCenterClassReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "class not found" });
    await withLog(
      this.logger,
      "work_center_class_delete",
      {
        id,
      },
      () => this.workCenterClassWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { WorkCenterClassService };
export type { PagedWorkCenterClassResult, TWorkCenterClassService };
