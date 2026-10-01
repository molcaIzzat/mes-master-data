import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateEquipment,
  Equipment,
  EquipmentFilter,
  EquipmentList,
  UpdateEquipment,
} from "./equipment.js";
import type { EquipmentReader, EquipmentWriter } from "./equipment-repository.js";

type PagedEquipmentResult = PagedResult<EquipmentList>;

type EquipmentServiceDeps = {
  equipmentReaderRepository: EquipmentReader;
  equipmentWriterRepository: EquipmentWriter;
  logger?: Logger;
};

type TEquipmentService = {
  findAll: (page: number, size: number, filter: EquipmentFilter) => Promise<PagedEquipmentResult>;
  findById: (id: number) => Promise<Equipment>;
  create: (input: CreateEquipment) => Promise<{ id: number }>;
  update: (id: number, input: UpdateEquipment) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class EquipmentService implements TEquipmentService {
  private equipmentReaderRepository: EquipmentReader;
  private equipmentWriterRepository: EquipmentWriter;
  private fallbackLogger: Logger;

  constructor({
    equipmentReaderRepository,
    equipmentWriterRepository,
    logger,
  }: EquipmentServiceDeps) {
    this.equipmentReaderRepository = equipmentReaderRepository;
    this.equipmentWriterRepository = equipmentWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: EquipmentFilter,
  ): Promise<PagedEquipmentResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.equipmentReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<Equipment> {
    const equipment = await this.equipmentReaderRepository.findById(id);
    if (!equipment) throw new HTTPException(404, { message: "equipment not found" });
    return equipment;
  }

  async create(input: CreateEquipment): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "equipment_create",
      {
        input,
      },
      () => this.equipmentWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateEquipment): Promise<{ id: number }> {
    const found = await this.equipmentReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "equipment not found" });
    const save = await withLog(
      this.logger,
      "equipment_update",
      {
        id,
        input,
      },
      () => this.equipmentWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.equipmentReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "equipment not found" });
    await withLog(
      this.logger,
      "equipment_delete",
      {
        id,
      },
      () => this.equipmentWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { EquipmentService };
export type { PagedEquipmentResult, TEquipmentService };
