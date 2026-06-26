import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";

import type { AreaList, AreaFilter, Area, CreateArea, UpdateArea } from "./area.js";
import type { AreaReader, AreaWriter } from "./area-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { HTTPException } from "hono/http-exception";

type PagedAreaResult = PagedResult<AreaList>;

type AreaServiceDeps = {
  areaReaderRepository: AreaReader;
  areaWriterRepository: AreaWriter;
  logger?: Logger;
};

type TAreaService = {
  findAll: (page: number, size: number, filter: AreaFilter) => Promise<PagedAreaResult>;
  findById: (id: number) => Promise<Area>;
  create: (input: CreateArea) => Promise<{ id: number }>;
  update: (id: number, input: UpdateArea) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class AreaService implements TAreaService {
  private areaReaderRepository: AreaReader;
  private areaWriterRepository: AreaWriter;
  private fallbackLogger: Logger;

  constructor({ areaReaderRepository, areaWriterRepository, logger }: AreaServiceDeps) {
    this.areaReaderRepository = areaReaderRepository;
    this.areaWriterRepository = areaWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: AreaFilter): Promise<PagedAreaResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.areaReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Area> {
    const area = await this.areaReaderRepository.findById(id);
    if (!area) throw new HTTPException(404, { message: "area not found" });
    return area;
  }

  async create(input: CreateArea): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "area_create",
      {
        input,
      },
      () => this.areaWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateArea): Promise<{ id: number }> {
    const found = await this.areaReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "area not found" });
    const save = await withLog(
      this.logger,
      "area_update",
      {
        areaId: id,
        input,
      },
      () => this.areaWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.areaReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "area not found" });
    await withLog(
      this.logger,
      "area_delete",
      {
        areaId: id,
      },
      () => this.areaWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { AreaService };
export type { PagedAreaResult, TAreaService };
