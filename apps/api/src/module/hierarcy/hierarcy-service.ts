import { buildPageMeta, type PagedResult } from "@molca/network";
import type { LineHierarcy, LineHierarcyFilter } from "./hierarcy.js";
import type { HierarcyReader } from "./hierarcy-repository.js";
import type { Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

type PagedLineHierarcyResult = PagedResult<LineHierarcy>;

type HierarcyServiceDeps = {
  hierarcyReaderRepository: HierarcyReader;
  logger?: Logger;
};

type THierarcyService = {
  findLineHierarcy: (
    page: number,
    size: number,
    filter: LineHierarcyFilter,
  ) => Promise<PagedLineHierarcyResult>;
};

class HierarcyService implements THierarcyService {
  private hierarcyReaderRepository: HierarcyReader;
  private fallbackLogger: Logger;

  constructor({ hierarcyReaderRepository, logger }: HierarcyServiceDeps) {
    this.hierarcyReaderRepository = hierarcyReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findLineHierarcy(
    page: number,
    size: number,
    filter: LineHierarcyFilter,
  ): Promise<PagedLineHierarcyResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.hierarcyReaderRepository.findLineHierarcy({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }
}

export { HierarcyService };
export type { PagedLineHierarcyResult, HierarcyServiceDeps, THierarcyService };
