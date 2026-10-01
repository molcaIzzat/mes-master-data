import { buildPageMeta, type PagedResult } from "@molca/network";

import type { LevelConfigurationFilter, LevelLine } from "./level-configuration.js";
import type { LevelConfigurationReader } from "./level-configuration-repository.js";

type PagedLevelConfigurationResult = PagedResult<LevelLine>;

type LevelConfigurationServiceDeps = {
  levelConfigurationReaderRepository: LevelConfigurationReader;
};

type TLevelConfigurationService = {
  findAll: (
    page: number,
    size: number,
    filter: LevelConfigurationFilter,
  ) => Promise<PagedLevelConfigurationResult>;
};

class LevelConfigurationService implements TLevelConfigurationService {
  private levelConfigurationReaderRepository: LevelConfigurationReader;

  constructor({ levelConfigurationReaderRepository }: LevelConfigurationServiceDeps) {
    this.levelConfigurationReaderRepository = levelConfigurationReaderRepository;
  }

  async findAll(
    page: number,
    size: number,
    filter: LevelConfigurationFilter,
  ): Promise<PagedLevelConfigurationResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.levelConfigurationReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }
}

export { LevelConfigurationService };
export type { PagedLevelConfigurationResult, TLevelConfigurationService };
