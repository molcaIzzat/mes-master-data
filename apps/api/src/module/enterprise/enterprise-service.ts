import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";

import type {
  EnterpriseList,
  EnterpriseFilter,
  Enterprise,
  CreateEnterprise,
  UpdateEnterprise,
} from "./enterprise.js";
import type { EnterpriseReader, EnterpriseWriter } from "./enterprise-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { HTTPException } from "hono/http-exception";

type PagedEnterpriseResult = PagedResult<EnterpriseList>;

type EnterpriseServiceDeps = {
  enterpriseReaderRepository: EnterpriseReader;
  enterpriseWriterRepository: EnterpriseWriter;
  logger?: Logger;
};

type TEnterpriseService = {
  findAll: (page: number, size: number, filter: EnterpriseFilter) => Promise<PagedEnterpriseResult>;
  findById: (id: number) => Promise<Enterprise>;
  create: (input: CreateEnterprise) => Promise<{ id: number }>;
  update: (id: number, input: UpdateEnterprise) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class EnterpriseService implements TEnterpriseService {
  private enterpriseReaderRepository: EnterpriseReader;
  private enterpriseWriterRepository: EnterpriseWriter;
  private fallbackLogger: Logger;

  constructor({
    enterpriseReaderRepository,
    enterpriseWriterRepository,
    logger,
  }: EnterpriseServiceDeps) {
    this.enterpriseReaderRepository = enterpriseReaderRepository;
    this.enterpriseWriterRepository = enterpriseWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: EnterpriseFilter,
  ): Promise<PagedEnterpriseResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.enterpriseReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Enterprise> {
    const enterprise = await this.enterpriseReaderRepository.findById(id);
    if (!enterprise) throw new HTTPException(404, { message: "enterprise not found" });
    return enterprise;
  }

  async create(input: CreateEnterprise): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "enterprise_create",
      {
        input,
      },
      () => this.enterpriseWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateEnterprise): Promise<{ id: number }> {
    const found = await this.enterpriseReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "enterprise not found" });
    const save = await withLog(
      this.logger,
      "enterprise_update",
      {
        enterpriseId: id,
        input,
      },
      () => this.enterpriseWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.enterpriseReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "enterprise not found" });
    await withLog(
      this.logger,
      "enterprise_delete",
      {
        enterpriseId: id,
      },
      () => this.enterpriseWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { EnterpriseService };
export type { PagedEnterpriseResult, TEnterpriseService };
