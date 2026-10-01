import { HTTPException } from "hono/http-exception";
import { buildPageMeta, type PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import { baseLogger, getRequestContext } from "@molca/observability";

import type {
  CreateEquipmentClass,
  EquipmentClass,
  EquipmentClassFilter,
  EquipmentClassList,
  UpdateEquipmentClass,
} from "./equipment-class.js";
import type { EquipmentClassReader, EquipmentClassWriter } from "./equipment-class-repository.js";

type PagedEquipmentClassResult = PagedResult<EquipmentClassList>;

type EquipmentClassServiceDeps = {
  equipmentClassReaderRepository: EquipmentClassReader;
  equipmentClassWriterRepository: EquipmentClassWriter;
  logger?: Logger;
};

type TEquipmentClassService = {
  findAll: (
    page: number,
    size: number,
    filter: EquipmentClassFilter,
  ) => Promise<PagedEquipmentClassResult>;
  findById: (id: number) => Promise<EquipmentClass>;
  create: (input: CreateEquipmentClass) => Promise<{ id: number }>;
  update: (id: number, input: UpdateEquipmentClass) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class EquipmentClassService implements TEquipmentClassService {
  private equipmentClassReaderRepository: EquipmentClassReader;
  private equipmentClassWriterRepository: EquipmentClassWriter;
  private fallbackLogger: Logger;

  constructor({
    equipmentClassReaderRepository,
    equipmentClassWriterRepository,
    logger,
  }: EquipmentClassServiceDeps) {
    this.equipmentClassReaderRepository = equipmentClassReaderRepository;
    this.equipmentClassWriterRepository = equipmentClassWriterRepository;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: EquipmentClassFilter,
  ): Promise<PagedEquipmentClassResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.equipmentClassReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    return { items, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<EquipmentClass> {
    const equipmentClass = await this.equipmentClassReaderRepository.findById(id);
    if (!equipmentClass) throw new HTTPException(404, { message: "class not found" });
    return equipmentClass;
  }

  async create(input: CreateEquipmentClass): Promise<{ id: number }> {
    const save = await withLog(
      this.logger,
      "equipment_class_create",
      {
        input,
      },
      () => this.equipmentClassWriterRepository.create(input),
    );

    return save;
  }

  async update(id: number, input: UpdateEquipmentClass): Promise<{ id: number }> {
    const found = await this.equipmentClassReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "class not found" });
    const save = await withLog(
      this.logger,
      "equipment_class_update",
      {
        id,
        input,
      },
      () => this.equipmentClassWriterRepository.update(id, input),
    );

    return save;
  }

  async delete(id: number): Promise<string> {
    const found = await this.equipmentClassReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "class not found" });
    await withLog(
      this.logger,
      "equipment_class_delete",
      {
        id,
      },
      () => this.equipmentClassWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { EquipmentClassService };
export type { PagedEquipmentClassResult, TEquipmentClassService };
