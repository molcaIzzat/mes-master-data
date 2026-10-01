import { baseLogger, getRequestContext } from "@molca/observability";
import { chunk } from "@molca/helper";

import type { AreaClientContract, AreaPartialFetch, AreaSummary } from "@molca/contract-client";
import type { Logger } from "@molca/utils";

import type { AreaReader } from "./area-repository.js";

type AreaClientDeps = {
  areaReaderRepository: AreaReader;
  logger?: Logger;
};

class AreaClient implements AreaClientContract {
  private areaReaderRepository: AreaReader;
  private fallbackLogger: Logger;

  constructor({ areaReaderRepository, logger }: AreaClientDeps) {
    this.areaReaderRepository = areaReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async existsById(id: number): Promise<boolean> {
    return await this.areaReaderRepository.existById(id);
  }

  async findById(id: number): Promise<AreaSummary | undefined> {
    return await this.areaReaderRepository.findById(id);
  }

  async getMany(ids: number[]): Promise<AreaPartialFetch<AreaSummary>> {
    const unique = [...new Set(ids)];
    const found: AreaSummary[] = [];

    for (const ids of chunk(unique, 1000)) {
      const rows = await this.areaReaderRepository.findSummariesByIds(ids);
      found.push(...rows);
    }

    const foundIds = new Set(found.map((s) => s.id));
    const missingIds = unique.filter((id) => !foundIds.has(id));

    return { found, missingIds };
  }
}

export { AreaClient };
export type { AreaClientDeps };
