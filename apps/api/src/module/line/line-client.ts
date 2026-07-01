import type { LineClientContract, LinePartialFetch, LineSummary } from "@molca/contract-client";
import type { Logger } from "@molca/utils";

import type { LineReader } from "./line-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { chunk } from "@molca/helper";

type LineClientDeps = {
  lineReaderRepository: LineReader;
  logger?: Logger;
};

class LineClient implements LineClientContract {
  private lineReaderRepository: LineReader;
  private fallbackLogger: Logger;

  constructor({ lineReaderRepository, logger }: LineClientDeps) {
    this.lineReaderRepository = lineReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async existsById(id: number): Promise<boolean> {
    return this.lineReaderRepository.existById(id);
  }

  async findById(id: number): Promise<LineSummary | undefined> {
    return this.lineReaderRepository.findById(id);
  }

  async getMany(ids: number[]): Promise<LinePartialFetch<LineSummary>> {
    const unique = [...new Set(ids)];
    const found: LineSummary[] = [];

    for (const ids of chunk(unique, 1000)) {
      const rows = await this.lineReaderRepository.findSummariesByIds(ids);
      found.push(...rows);
    }

    const foundIds = new Set(found.map((s) => s.id));
    const missingIds = unique.filter((id) => !foundIds.has(id));

    return { found, missingIds };
  }
}

export { LineClient };
export type { LineClientDeps };
