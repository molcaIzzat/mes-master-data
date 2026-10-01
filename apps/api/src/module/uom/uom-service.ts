import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { CreateUom, Uom, UomFilter, UomList, UpdateUom } from "./uom.js";
import type { UomReader, UomWriter } from "./uom-repository.js";

type PagedUomResult = PagedResult<UomList>;

type UomServiceDeps = {
  uomReaderRepository: UomReader;
  uomWriterRepository: UomWriter;
  logger?: Logger;
};

type TUomService = {
  findAll: (page: number, size: number, filter: UomFilter) => Promise<PagedUomResult>;
  findById: (id: number) => Promise<Uom>;
  create: (input: CreateUom) => Promise<{ id: number }>;
  update: (id: number, input: UpdateUom) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class UomService implements TUomService {
  private uomReaderRepository: UomReader;
  private uomWriterRepository: UomWriter;
  private fallbackLogger: Logger;

  constructor({ uomReaderRepository, uomWriterRepository, logger }: UomServiceDeps) {
    this.uomReaderRepository = uomReaderRepository;
    this.uomWriterRepository = uomWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: UomFilter): Promise<PagedUomResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.uomReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Uom> {
    const uom = await this.uomReaderRepository.findById(id);
    if (!uom) throw new HTTPException(404, { message: "uom not found" });
    return uom;
  }

  async create(input: CreateUom): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "uom_create",
      {
        input,
      },
      () => this.uomWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateUom): Promise<{ id: number }> {
    const found = await this.uomReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "uom not found" });
    const save = await withLog(
      this.logger,
      "uom_update",
      {
        id,
        input,
      },
      () => this.uomWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.uomReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "uom not found" });
    await withLog(
      this.logger,
      "uom_delete",
      {
        id,
      },
      () => this.uomWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { UomService };
export type { PagedUomResult, TUomService };
