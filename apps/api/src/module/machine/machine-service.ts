import { buildPageMeta, type PagedResult } from "@molca/network";
import type {
  CreateMachine,
  CreateSubMachine,
  Machine,
  MachineFilter,
  MachineList,
  SubMachine,
  SubMachineFilter,
  SubMachineList,
  UpdateMachine,
  UpdateSubMachine,
} from "./machine.js";
import type { MachineReader, MachineWriter } from "./machine-repository.js";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";
import { HTTPException } from "hono/http-exception";

type PagedMachineResult = PagedResult<MachineList>;
type PagedSubMachineResult = PagedResult<SubMachineList>;

type MachineServiceDeps = {
  machineReaderRepository: MachineReader;
  machineWriterRepository: MachineWriter;
  logger?: Logger;
};

type TMachineService = {
  findAll: (page: number, size: number, filter: MachineFilter) => Promise<PagedMachineResult>;
  findAllSub: (
    page: number,
    size: number,
    filter: SubMachineFilter,
  ) => Promise<PagedSubMachineResult>;
  findById: (id: number) => Promise<Machine>;
  findSubById: (id: number) => Promise<SubMachine>;
  create: (input: CreateMachine) => Promise<{ id: number }>;
  createSub: (input: CreateSubMachine) => Promise<{ id: number }>;
  update: (id: number, input: UpdateMachine) => Promise<{ id: number }>;
  updateSub: (id: number, input: UpdateSubMachine) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
  deleteSub: (id: number) => Promise<string>;
};

class MachineService implements TMachineService {
  private machineReaderRepository: MachineReader;
  private machineWriterRepository: MachineWriter;
  private fallbackLogger: Logger;

  constructor({ machineReaderRepository, machineWriterRepository, logger }: MachineServiceDeps) {
    this.machineReaderRepository = machineReaderRepository;
    this.machineWriterRepository = machineWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(page: number, size: number, filter: MachineFilter): Promise<PagedMachineResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.machineReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findAllSub(
    page: number,
    size: number,
    filter: SubMachineFilter,
  ): Promise<PagedSubMachineResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.machineReaderRepository.findAllSub({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Machine> {
    const machine = await this.machineReaderRepository.findById(id);
    if (!machine) throw new HTTPException(404, { message: "machine not found" });
    return machine;
  }

  async findSubById(id: number): Promise<SubMachine> {
    const machine = await this.machineReaderRepository.findSubById(id);
    if (!machine) throw new HTTPException(404, { message: "sub machine not found" });
    return machine;
  }

  async create(input: CreateMachine): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "machine_create",
      {
        input,
      },
      () => this.machineWriterRepository.create(input),
    );

    return save;
  }

  async createSub(input: CreateSubMachine): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "sub_machine_create",
      {
        input,
      },
      () => this.machineWriterRepository.createSub(input),
    );

    return save;
  }

  async update(id: number, input: UpdateMachine): Promise<{ id: number }> {
    const found = await this.machineReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "machine not found" });
    const save = await withLog(
      this.logger,
      "machine_update",
      {
        machineId: id,
        input,
      },
      () => this.machineWriterRepository.update(id, input),
    );

    return save;
  }

  async updateSub(id: number, input: UpdateSubMachine): Promise<{ id: number }> {
    const found = await this.machineReaderRepository.findSubById(id);
    if (!found) throw new HTTPException(404, { message: "sub machine not found" });
    const save = await withLog(
      this.logger,
      "sub_machine_update",
      {
        subMachineId: id,
        input,
      },
      () => this.machineWriterRepository.updateSub(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.machineReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "machine not found" });
    await withLog(
      this.logger,
      "machine_delete",
      {
        machineId: id,
      },
      () => this.machineWriterRepository.delete(id),
    );

    return "ok";
  }

  async deleteSub(id: number): Promise<string> {
    const found = await this.machineReaderRepository.findSubById(id);
    if (!found) throw new HTTPException(404, { message: "sub machine not found" });
    await withLog(
      this.logger,
      "sub_machine_delete",
      {
        subMachineId: id,
      },
      () => this.machineWriterRepository.deleteSub(id),
    );

    return "ok";
  }
}

export { MachineService };
export type { PagedMachineResult, TMachineService };
