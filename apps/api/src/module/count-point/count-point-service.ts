import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateCountPoint,
  CountPoint,
  CountPointList,
  UpdateCountPoint,
} from "./count-point.js";
import type { CountPointReader, CountPointWriter } from "./count-point-repository.js";

type PagedCountPointResult = PagedResult<CountPointList>;

type CountPointServiceDeps = {
  countPointReaderRepository: CountPointReader;
  countPointWriterRepository: CountPointWriter;
  logger?: Logger;
};

type TCountPointService = {
  findManyByWorkUnitId: (
    workUnitId: number,
    page: number,
    size: number,
  ) => Promise<PagedCountPointResult>;
  findById: (id: number) => Promise<CountPoint>;
  create: (input: CreateCountPoint) => Promise<{ id: number }>;
  update: (id: number, input: UpdateCountPoint) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class CountPointService implements TCountPointService {
  private countPointReaderRepository: CountPointReader;
  private countPointWriterRepository: CountPointWriter;
  private fallbackLogger: Logger;

  constructor({
    countPointReaderRepository,
    countPointWriterRepository,
    logger,
  }: CountPointServiceDeps) {
    this.countPointReaderRepository = countPointReaderRepository;
    this.countPointWriterRepository = countPointWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    page: number,
    size: number,
  ): Promise<PagedCountPointResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.countPointReaderRepository.findManyByWorkUnitId(
      workUnitId,
      {
        limit,
        offset,
      },
    );

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<CountPoint> {
    const found = await this.countPointReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "point not found" });
    return found;
  }

  async create(input: CreateCountPoint): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "count_point_create",
      {
        input,
      },
      () => this.countPointWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateCountPoint): Promise<{ id: number }> {
    const found = await this.countPointReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "point not found" });
    const save = await withLog(
      this.logger,
      "count_point_update",
      {
        id,
        input,
      },
      () => this.countPointWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.countPointReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "point not found" });
    await withLog(
      this.logger,
      "count_point_delete",
      {
        id,
      },
      () => this.countPointWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { CountPointService };
export type { PagedCountPointResult, TCountPointService };
