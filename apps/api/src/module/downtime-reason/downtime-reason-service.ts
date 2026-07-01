import { HTTPException } from "hono/http-exception";
import { buildPageMeta } from "@molca/network";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { PagedResult } from "@molca/network";
import type { Logger } from "@molca/utils";
import type {
  AreaClientContract,
  AreaSummary,
  LineClientContract,
  LineSummary,
  MachineClientContract,
  MachineSummary,
} from "@molca/contract-client";

import type {
  DowntimeReasonEnriched,
  DowntimeReasonEnrichedList,
  DowntimeReasonFilter,
} from "./downtime-reason.js";
import type { DowntimeReasonReader, DowntimeReasonWriter } from "./downtime-reason-repository.js";

type PagedDowntimeReasonResult = PagedResult<DowntimeReasonEnrichedList>;

type DowntimeReasonServiceDeps = {
  downtimeReasonReaderRepository: DowntimeReasonReader;
  downtimeReasonWriterRepository: DowntimeReasonWriter;
  areaClient: AreaClientContract;
  lineClient: LineClientContract;
  machineClient: MachineClientContract;
  logger?: Logger;
};

type TDowntimeReasonService = {
  findAll: (
    page: number,
    size: number,
    filter: DowntimeReasonFilter,
  ) => Promise<PagedDowntimeReasonResult>;
  findById: (id: number) => Promise<DowntimeReasonEnriched>;
};

class DowntimeReasonService implements TDowntimeReasonService {
  private downtimeReasonReaderRepository: DowntimeReasonReader;
  private downtimeReasonWriterRepository: DowntimeReasonWriter;
  private areaClient: AreaClientContract;
  private lineClient: LineClientContract;
  private machineClient: MachineClientContract;
  private fallbackLogger: Logger;

  constructor({
    downtimeReasonReaderRepository,
    downtimeReasonWriterRepository,
    areaClient,
    lineClient,
    machineClient,
    logger,
  }: DowntimeReasonServiceDeps) {
    this.downtimeReasonReaderRepository = downtimeReasonReaderRepository;
    this.downtimeReasonWriterRepository = downtimeReasonWriterRepository;
    this.areaClient = areaClient;
    this.lineClient = lineClient;
    this.machineClient = machineClient;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: DowntimeReasonFilter,
  ): Promise<PagedDowntimeReasonResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.downtimeReasonReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    const areaIds = items.map((dr) => dr.areaIds).flat();
    const uniqueAreaIds = [...new Set(areaIds)];

    const lineIds = items.map((dr) => dr.lineIds).flat();
    const uniqueLineIds = [...new Set(lineIds)];

    const machineIds = items.map((dr) => dr.machineIds).flat();
    const uniqueMachineIds = [...new Set(machineIds)];

    const areaResult = await this.areaClient.getMany(uniqueAreaIds);
    const areaById = new Map(areaResult.found.map((a) => [a.id, a]));

    const lineResult = await this.lineClient.getMany(uniqueLineIds);
    const lineById = new Map(lineResult.found.map((l) => [l.id, l]));

    const machineResult = await this.machineClient.getMany(uniqueMachineIds);
    const machineById = new Map(machineResult.found.map((m) => [m.id, m]));

    const enriched = items.map(({ areaIds, lineIds, machineIds, ...rest }) => ({
      ...rest,
      areas: areaIds.map((id) => areaById.get(id)).filter((a): a is AreaSummary => a !== undefined),
      lines: lineIds.map((id) => lineById.get(id)).filter((a): a is LineSummary => a !== undefined),
      machines: machineIds
        .map((id) => machineById.get(id))
        .filter((a): a is MachineSummary => a !== undefined),
    }));

    return { items: enriched, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<DowntimeReasonEnriched> {
    const dr = await this.downtimeReasonReaderRepository.findById(id);
    if (!dr) throw new HTTPException(404, { message: "reason not found" });

    const { areaIds, lineIds, machineIds, ...rest } = dr;
    const uniqueAreaIds = [...new Set(areaIds)];
    const uniqueLineIds = [...new Set(lineIds)];
    const uniqueMachineIds = [...new Set(machineIds)];

    const areaResult = await this.areaClient.getMany(uniqueAreaIds);
    const areaById = new Map(areaResult.found.map((a) => [a.id, a]));

    const lineResult = await this.lineClient.getMany(uniqueLineIds);
    const lineById = new Map(lineResult.found.map((l) => [l.id, l]));

    const machineResult = await this.machineClient.getMany(uniqueMachineIds);
    const machineById = new Map(machineResult.found.map((m) => [m.id, m]));

    return {
      ...rest,
      areas: areaIds.map((id) => areaById.get(id)).filter((a): a is AreaSummary => a !== undefined),
      lines: lineIds.map((id) => lineById.get(id)).filter((a): a is LineSummary => a !== undefined),
      machines: machineIds
        .map((id) => machineById.get(id))
        .filter((a): a is MachineSummary => a !== undefined),
    };
  }
}

export { DowntimeReasonService };
export type { PagedDowntimeReasonResult, TDowntimeReasonService };
