import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { CreateSite, Site, SiteFilter, SiteList, UpdateSite } from "./site.js";
import type { SiteReader, SiteWriter } from "./site-repository.js";

type PagedSiteResult = PagedResult<SiteList>;

type SiteServiceDeps = {
  siteReaderRepository: SiteReader;
  siteWriterRepository: SiteWriter;
  logger?: Logger;
};

type TSiteService = {
  findAll: (page: number, size: number, filter: SiteFilter) => Promise<PagedSiteResult>;
  findById: (id: number) => Promise<Site>;
  create: (input: CreateSite) => Promise<{ id: number }>;
  update: (id: number, input: UpdateSite) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class SiteService implements TSiteService {
  private siteReaderRepository: SiteReader;
  private siteWriterRepository: SiteWriter;
  private fallbackLogger: Logger;

  constructor({ siteReaderRepository, siteWriterRepository, logger }: SiteServiceDeps) {
    this.siteReaderRepository = siteReaderRepository;
    this.siteWriterRepository = siteWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: SiteFilter): Promise<PagedSiteResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.siteReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Site> {
    const site = await this.siteReaderRepository.findById(id);
    if (!site) throw new HTTPException(404, { message: "site not found" });
    return site;
  }

  async create(input: CreateSite): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "site_create",
      {
        input,
      },
      () => this.siteWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateSite): Promise<{ id: number }> {
    const found = await this.siteReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "site unit not found" });
    const save = await withLog(
      this.logger,
      "site_update",
      {
        id,
        input,
      },
      () => this.siteWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.siteReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "site unit not found" });
    await withLog(
      this.logger,
      "site_delete",
      {
        id,
      },
      () => this.siteWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { SiteService };
export type { PagedSiteResult, TSiteService };
