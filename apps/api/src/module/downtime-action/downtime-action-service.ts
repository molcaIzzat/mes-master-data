import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateDowntimeAction,
  DowntimeAction,
  DowntimeActionFilter,
  DowntimeActionList,
  UpdateDowntimeAction,
} from "./downtime-action.js";
import type { DowntimeActionReader, DowntimeActionWriter } from "./downtime-action-repository.js";

type PagedDowntimeActionResult = PagedResult<DowntimeActionList>;

type DowntimeActionServiceDeps = {
  downtimeActionReaderRepository: DowntimeActionReader;
  downtimeActionWriterRepository: DowntimeActionWriter;
  logger?: Logger;
};

type TDowntimeActionService = {
  findAll: (
    page: number,
    size: number,
    filter: DowntimeActionFilter,
  ) => Promise<PagedDowntimeActionResult>;
  findById: (id: number) => Promise<DowntimeAction>;
  create: (input: CreateDowntimeAction) => Promise<{ id: number }>;
  update: (id: number, input: UpdateDowntimeAction) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class DowntimeActionService implements TDowntimeActionService {
  private downtimeActionReaderRepository: DowntimeActionReader;
  private downtimeActionWriterRepository: DowntimeActionWriter;
  private fallbackLogger: Logger;

  constructor({
    downtimeActionReaderRepository,
    downtimeActionWriterRepository,
    logger,
  }: DowntimeActionServiceDeps) {
    this.downtimeActionReaderRepository = downtimeActionReaderRepository;
    this.downtimeActionWriterRepository = downtimeActionWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: DowntimeActionFilter,
  ): Promise<PagedDowntimeActionResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.downtimeActionReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<DowntimeAction> {
    const found = await this.downtimeActionReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "action not found" });
    return found;
  }

  async create(input: CreateDowntimeAction): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "downtime_action_create",
      {
        input,
      },
      () => this.downtimeActionWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateDowntimeAction): Promise<{ id: number }> {
    const found = await this.downtimeActionReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "action not found" });
    const save = await withLog(
      this.logger,
      "action_update",
      {
        id,
        input,
      },
      () => this.downtimeActionWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.downtimeActionReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "action not found" });
    await withLog(
      this.logger,
      "action_delete",
      {
        id,
      },
      () => this.downtimeActionWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { DowntimeActionService };
export type { PagedDowntimeActionResult, TDowntimeActionService };
