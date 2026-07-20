import { baseLogger, getRequestContext } from "@molca/observability";
import { chunk } from "@molca/helper";

import type {
  EnterpriseClientContract,
  EnterprisePartialFetch,
  EnterpriseSummary,
} from "@molca/contract-client";
import type { Logger } from "@molca/utils";

import type { EnterpriseReader } from "./enterprise-repository.js";

type EnterpriseClientDeps = {
  enterpriseReaderRepository: EnterpriseReader;
  logger?: Logger;
};

class EnterpriseClient implements EnterpriseClientContract {
  private enterpriseReaderRepository: EnterpriseReader;
  private fallbackLogger: Logger;

  constructor({ enterpriseReaderRepository, logger }: EnterpriseClientDeps) {
    this.enterpriseReaderRepository = enterpriseReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async existsById(id: number): Promise<boolean> {
    return await this.enterpriseReaderRepository.existById(id);
  }

  async findById(id: number): Promise<EnterpriseSummary | undefined> {
    return await this.enterpriseReaderRepository.findById(id);
  }

  async getMany(ids: number[]): Promise<EnterprisePartialFetch<EnterpriseSummary>> {
    const unique = [...new Set(ids)];
    const found: EnterpriseSummary[] = [];

    for (const ids of chunk(unique, 1000)) {
      const rows = await this.enterpriseReaderRepository.findSummariesByIds(ids);
      found.push(...rows);
    }

    const foundIds = new Set(found.map((s) => s.id));
    const missingIds = unique.filter((id) => !foundIds.has(id));

    return { found, missingIds };
  }
}

export { EnterpriseClient };
export type { EnterpriseClientDeps };
