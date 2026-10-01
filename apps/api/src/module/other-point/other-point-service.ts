import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateOtherPoint,
  OtherPoint,
  OtherPointList,
  ImportOtherPointResult,
  ImportOtherPointRow,
  UpdateOtherPoint,
} from "./other-point.js";
import type { OtherPointReader, OtherPointWriter } from "./other-point-repository.js";

type PagedOtherPointResult = PagedResult<OtherPointList>;

type OtherPointServiceDeps = {
  otherPointReaderRepository: OtherPointReader;
  otherPointWriterRepository: OtherPointWriter;
  logger?: Logger;
};

type TOtherPointService = {
  findManyByWorkUnitId: (
    workUnitId: number,
    page: number,
    size: number,
  ) => Promise<PagedOtherPointResult>;
  findById: (id: number) => Promise<OtherPoint>;
  create: (input: CreateOtherPoint) => Promise<{ id: number }>;
  update: (id: number, input: UpdateOtherPoint) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
  importMany: (workUnitId: number, rows: ImportOtherPointRow[]) => Promise<ImportOtherPointResult>;
};

class OtherPointService implements TOtherPointService {
  private otherPointReaderRepository: OtherPointReader;
  private otherPointWriterRepository: OtherPointWriter;
  private fallbackLogger: Logger;

  constructor({
    otherPointReaderRepository,
    otherPointWriterRepository,
    logger,
  }: OtherPointServiceDeps) {
    this.otherPointReaderRepository = otherPointReaderRepository;
    this.otherPointWriterRepository = otherPointWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    page: number,
    size: number,
  ): Promise<PagedOtherPointResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.otherPointReaderRepository.findManyByWorkUnitId(
      workUnitId,
      {
        limit,
        offset,
      },
    );

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<OtherPoint> {
    const found = await this.otherPointReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "point not found" });
    return found;
  }

  async create(input: CreateOtherPoint): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "other_point_create",
      {
        input,
      },
      () => this.otherPointWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateOtherPoint): Promise<{ id: number }> {
    const found = await this.otherPointReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "point not found" });
    const save = await withLog(
      this.logger,
      "other_point_update",
      {
        id,
        input,
      },
      () => this.otherPointWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.otherPointReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "point not found" });
    await withLog(
      this.logger,
      "other_point_delete",
      {
        id,
      },
      () => this.otherPointWriterRepository.delete(id),
    );

    return "ok";
  }

  // Validation and the write share one transaction inside the repository, so a
  // bad reference anywhere in the file leaves the machine untouched.
  async importMany(
    workUnitId: number,
    rows: ImportOtherPointRow[],
  ): Promise<ImportOtherPointResult> {
    const result = await withLog(
      this.logger,
      "other_point_import",
      {
        workUnitId,
        total: rows.length,
      },
      () => this.otherPointWriterRepository.importMany(workUnitId, rows),
    );

    return result;
  }
}

export { OtherPointService };
export type { PagedOtherPointResult, TOtherPointService };
