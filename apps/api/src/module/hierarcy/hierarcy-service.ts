import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateLineWithMachines,
  CreateMachines,
  CreateSubMachines,
  LineHierarcy,
  LineHierarcyFilter,
} from "./hierarcy.js";
import type { HierarcyReader, HierarcyWriter } from "./hierarcy-repository.js";
import type { LineReader } from "../line/line-repository.js";
import type { MachineReader } from "../machine/machine-repository.js";

type PagedLineHierarcyResult = PagedResult<LineHierarcy>;

type HierarcyServiceDeps = {
  hierarcyReaderRepository: HierarcyReader;
  hierarcyWriterRepository: HierarcyWriter;
  lineReaderRepository: LineReader;
  machineReaderRepository: MachineReader;
  logger?: Logger;
};

type THierarcyService = {
  findLineHierarcy: (
    page: number,
    size: number,
    filter: LineHierarcyFilter,
  ) => Promise<PagedLineHierarcyResult>;
  createLineWithMachines: (input: CreateLineWithMachines) => Promise<string>;
  createMachines: (lineId: number, machines: CreateMachines) => Promise<string>;
  createSubMachines: (machineId: number, machines: CreateSubMachines) => Promise<string>;
};

class HierarcyService implements THierarcyService {
  private hierarcyReaderRepository: HierarcyReader;
  private hierarcyWriterRepository: HierarcyWriter;
  private lineReaderRepository: LineReader;
  private machineReaderRepository: MachineReader;
  private fallbackLogger: Logger;

  constructor({
    hierarcyReaderRepository,
    hierarcyWriterRepository,
    lineReaderRepository,
    machineReaderRepository,
    logger,
  }: HierarcyServiceDeps) {
    this.hierarcyReaderRepository = hierarcyReaderRepository;
    this.hierarcyWriterRepository = hierarcyWriterRepository;
    this.lineReaderRepository = lineReaderRepository;
    this.machineReaderRepository = machineReaderRepository;
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

  async createLineWithMachines(input: CreateLineWithMachines): Promise<string> {
    await withLog(this.logger, "hierarcy_line_create", { input }, () =>
      this.hierarcyWriterRepository.createLine(input),
    );
    return "ok";
  }

  async createMachines(lineId: number, machines: CreateMachines): Promise<string> {
    const line = await this.lineReaderRepository.existById(lineId);
    if (!line) throw new HTTPException(404, { message: "line not found" });
    await withLog(this.logger, "hierarcy_machine_create", { lineId, machines }, () =>
      this.hierarcyWriterRepository.createMachines(lineId, machines),
    );
    return "ok";
  }

  async createSubMachines(machineId: number, machines: CreateSubMachines): Promise<string> {
    const machine = await this.machineReaderRepository.existById(machineId);
    if (!machine) throw new HTTPException(404, { message: "machine not found" });
    await withLog(this.logger, "hierarcy_sub_machine_create", { machineId, machines }, () =>
      this.hierarcyWriterRepository.createSubMachines(machineId, machines),
    );
    return "ok";
  }
}

export { HierarcyService };
export type { PagedLineHierarcyResult, HierarcyServiceDeps, THierarcyService };
