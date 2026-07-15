import type {
  EquipmentClientContract,
  EquipmentPartialFetch,
  EquipmentSummary,
} from "@molca/contract-client";
import type { Logger } from "@molca/utils";

import type { EquipmentReader } from "./equipment-repository.js";
import { baseLogger, getRequestContext } from "@molca/observability";
import { chunk } from "@molca/helper";

type EquipmentClientDeps = {
  equipmentReaderRepository: EquipmentReader;
  logger?: Logger;
};

class EquipmentClient implements EquipmentClientContract {
  private equipmentReaderRepository: EquipmentReader;
  private fallbackLogger: Logger;

  constructor({ equipmentReaderRepository, logger }: EquipmentClientDeps) {
    this.equipmentReaderRepository = equipmentReaderRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async existsById(id: number): Promise<boolean> {
    return await this.equipmentReaderRepository.existById(id);
  }

  async findById(id: number): Promise<EquipmentSummary | undefined> {
    return await this.equipmentReaderRepository.findById(id);
  }

  async getMany(ids: number[]): Promise<EquipmentPartialFetch<EquipmentSummary>> {
    const unique = [...new Set(ids)];
    const found: EquipmentSummary[] = [];

    for (const ids of chunk(unique, 1000)) {
      const rows = await this.equipmentReaderRepository.findSummariesByIds(ids);
      found.push(...rows);
    }

    const foundIds = new Set(found.map((s) => s.id));
    const missingIds = unique.filter((id) => !foundIds.has(id));

    return { found, missingIds };
  }
}

export { EquipmentClient };
export type { EquipmentClientDeps };
