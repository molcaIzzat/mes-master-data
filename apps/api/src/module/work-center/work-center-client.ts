import type {
  WorkCenterClientContract,
  WorkCenterPartialFetch,
  WorkCenterSummary,
} from "@molca/contract-client";
import type { Logger } from "@molca/utils";

import type { WorkCenterReader } from "./work-center-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { chunk } from "@molca/helper";

type WorkCenterClientDeps = {
  workCenterReaderRepository: WorkCenterReader;
  logger?: Logger;
};

class WorkCenterClient implements WorkCenterClientContract {
  private workCenterReaderRepository: WorkCenterReader;
  private fallbackLogger: Logger;

  constructor({ workCenterReaderRepository, logger }: WorkCenterClientDeps) {
    this.workCenterReaderRepository = workCenterReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async existsById(id: number): Promise<boolean> {
    return await this.workCenterReaderRepository.existById(id);
  }

  async findById(id: number): Promise<WorkCenterSummary | undefined> {
    return await this.workCenterReaderRepository.findById(id);
  }

  async getMany(ids: number[]): Promise<WorkCenterPartialFetch<WorkCenterSummary>> {
    const unique = [...new Set(ids)];
    const found: WorkCenterSummary[] = [];

    for (const ids of chunk(unique, 1000)) {
      const rows = await this.workCenterReaderRepository.findSummariesByIds(ids);
      found.push(...rows);
    }

    const foundIds = new Set(found.map((s) => s.id));
    const missingIds = unique.filter((id) => !foundIds.has(id));

    return { found, missingIds };
  }
}

export { WorkCenterClient };
export type { WorkCenterClientDeps };
