import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { CreateLine, Line, LineFilter, LineList, UpdateLine } from "./line.js";
import type { LineReader, LineWriter } from "./line-repository.js";

type PagedLineResult = PagedResult<LineList>;

type LineServiceDeps = {
  lineReaderRepository: LineReader;
  lineWriterRepository: LineWriter;
  logger?: Logger;
};

type TLineService = {
  findAll: (page: number, size: number, filter: LineFilter) => Promise<PagedLineResult>;
  findById: (id: number) => Promise<Line>;
  create: (input: CreateLine) => Promise<{ id: number }>;
  update: (id: number, input: UpdateLine) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class LineService implements TLineService {
  private lineReaderRepository: LineReader;
  private lineWriterRepository: LineWriter;
  private fallbackLogger: Logger;

  constructor({ lineReaderRepository, lineWriterRepository, logger }: LineServiceDeps) {
    this.lineReaderRepository = lineReaderRepository;
    this.lineWriterRepository = lineWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: LineFilter): Promise<PagedLineResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.lineReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Line> {
    const line = await this.lineReaderRepository.findById(id);
    if (!line) throw new HTTPException(404, { message: "line not found" });
    return line;
  }

  async create(input: CreateLine): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "line_create",
      {
        input,
      },
      () => this.lineWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateLine): Promise<{ id: number }> {
    const found = await this.lineReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "line not found" });
    const save = await withLog(
      this.logger,
      "line_update",
      {
        lineId: id,
        input,
      },
      () => this.lineWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.lineReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "line not found" });
    await withLog(
      this.logger,
      "line_delete",
      {
        lineId: id,
      },
      () => this.lineWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { LineService };
export type { PagedLineResult, TLineService };
