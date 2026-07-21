import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateWorkUnitClass,
  WorkUnitClass,
  WorkUnitClassFilter,
  WorkUnitClassList,
  UpdateWorkUnitClass,
} from "./work-unit-class.js";
import type { WorkUnitClassReader, WorkUnitClassWriter } from "./work-unit-class-repository.js";

type PagedWorkUnitClassResult = PagedResult<WorkUnitClassList>;

type WorkUnitClassServiceDeps = {
  workUnitClassReaderRepository: WorkUnitClassReader;
  workUnitClassWriterRepository: WorkUnitClassWriter;
  logger?: Logger;
};

type TWorkUnitClassService = {
  findAll: (
    page: number,
    size: number,
    filter: WorkUnitClassFilter,
  ) => Promise<PagedWorkUnitClassResult>;
  findById: (id: number) => Promise<WorkUnitClass>;
  create: (input: CreateWorkUnitClass) => Promise<{ id: number }>;
  update: (id: number, input: UpdateWorkUnitClass) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class WorkUnitClassService implements TWorkUnitClassService {
  private workUnitClassReaderRepository: WorkUnitClassReader;
  private workUnitClassWriterRepository: WorkUnitClassWriter;
  private fallbackLogger: Logger;

  constructor({
    workUnitClassReaderRepository,
    workUnitClassWriterRepository,
    logger,
  }: WorkUnitClassServiceDeps) {
    this.workUnitClassReaderRepository = workUnitClassReaderRepository;
    this.workUnitClassWriterRepository = workUnitClassWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: WorkUnitClassFilter,
  ): Promise<PagedWorkUnitClassResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.workUnitClassReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<WorkUnitClass> {
    const workUnitClass = await this.workUnitClassReaderRepository.findById(id);
    if (!workUnitClass) throw new HTTPException(404, { message: "class not found" });
    return workUnitClass;
  }

  async create(input: CreateWorkUnitClass): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "work_unit_class_create",
      {
        input,
      },
      () => this.workUnitClassWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateWorkUnitClass): Promise<{ id: number }> {
    const found = await this.workUnitClassReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "class not found" });
    const save = await withLog(
      this.logger,
      "work_unit_class_update",
      {
        id,
        input,
      },
      () => this.workUnitClassWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.workUnitClassReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "class not found" });
    await withLog(
      this.logger,
      "work_unit_class_delete",
      {
        id,
      },
      () => this.workUnitClassWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { WorkUnitClassService };
export type { PagedWorkUnitClassResult, TWorkUnitClassService };
