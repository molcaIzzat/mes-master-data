import type {
  MachineClientContract,
  MachinePartialFetch,
  MachineSummary,
} from "@molca/contract-client";
import type { Logger } from "@molca/utils";

import type { MachineReader } from "./machine-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { chunk } from "@molca/helper";

type MachineClientDeps = {
  machineReaderRepository: MachineReader;
  logger?: Logger;
};

class MachineClient implements MachineClientContract {
  private machineReaderRepository: MachineReader;
  private fallbackLogger: Logger;

  constructor({ machineReaderRepository, logger }: MachineClientDeps) {
    this.machineReaderRepository = machineReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async existsById(id: number): Promise<boolean> {
    return await this.machineReaderRepository.existById(id);
  }

  async findById(id: number): Promise<MachineSummary | undefined> {
    return await this.machineReaderRepository.findById(id);
  }

  async getMany(ids: number[]): Promise<MachinePartialFetch<MachineSummary>> {
    const unique = [...new Set(ids)];
    const found: MachineSummary[] = [];

    for (const ids of chunk(unique, 1000)) {
      const rows = await this.machineReaderRepository.findSummariesByIds(ids);
      found.push(...rows);
    }

    const foundIds = new Set(found.map((s) => s.id));
    const missingIds = unique.filter((id) => !foundIds.has(id));

    return { found, missingIds };
  }
}

export { MachineClient };
export type { MachineClientDeps };
