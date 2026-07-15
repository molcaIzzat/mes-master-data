import { HTTPException } from "hono/http-exception";
import { buildPageMeta } from "@molca/network";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import type {
  AreaClientContract,
  AreaSummary,
  WorkCenterClientContract,
  WorkCenterSummary,
  EquipmentClientContract,
  EquipmentSummary,
} from "@molca/contract-client";

import type {
  CreateRejectReason,
  RejectReasonEnriched,
  RejectReasonEnrichedList,
  RejectReasonFilter,
  UpdateRejectReason,
} from "./reject-reason.js";
import type { RejectReasonReader, RejectReasonWriter } from "./reject-reason-repository.js";

type PagedRejectReasonResult = PagedResult<RejectReasonEnrichedList>;

type RejectReasonServiceDeps = {
  rejectReasonReaderRepository: RejectReasonReader;
  rejectReasonWriterRepository: RejectReasonWriter;
  areaClient: AreaClientContract;
  workCenterClient: WorkCenterClientContract;
  equipmentClient: EquipmentClientContract;
  logger?: Logger;
};

type TRejectReasonService = {
  findAll: (
    page: number,
    size: number,
    filter: RejectReasonFilter,
  ) => Promise<PagedRejectReasonResult>;
  findById: (id: number) => Promise<RejectReasonEnriched>;
  create: (input: CreateRejectReason) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateRejectReason) => Promise<{ id: number }>;
  delete: (id: number) => Promise<string>;
};

class RejectReasonService implements TRejectReasonService {
  private rejectReasonReaderRepository: RejectReasonReader;
  private rejectReasonWriterRepository: RejectReasonWriter;
  private areaClient: AreaClientContract;
  private workCenterClient: WorkCenterClientContract;
  private equipmentClient: EquipmentClientContract;
  private fallbackLogger: Logger;

  constructor({
    rejectReasonReaderRepository,
    rejectReasonWriterRepository,
    areaClient,
    workCenterClient,
    equipmentClient,
    logger,
  }: RejectReasonServiceDeps) {
    this.rejectReasonReaderRepository = rejectReasonReaderRepository;
    this.rejectReasonWriterRepository = rejectReasonWriterRepository;
    this.areaClient = areaClient;
    this.workCenterClient = workCenterClient;
    this.equipmentClient = equipmentClient;
    this.fallbackLogger = logger ?? baseLogger;
  }

  private get logger(): Logger {
    return getRequestContext()?.logger ?? this.fallbackLogger;
  }

  async findAll(
    page: number,
    size: number,
    filter: RejectReasonFilter,
  ): Promise<PagedRejectReasonResult> {
    const limit = size;
    const offset = (page - 1) * limit;

    const { items, totalElements } = await this.rejectReasonReaderRepository.findAll({
      limit,
      offset,
      filter,
    });

    const areaIds = items.map((dr) => dr.areaIds).flat();
    const uniqueAreaIds = [...new Set(areaIds)];

    const workCenterIds = items.map((dr) => dr.workCenterIds).flat();
    const uniqueWorkCenterIds = [...new Set(workCenterIds)];

    const equipmentIds = items.map((dr) => dr.equipmentIds).flat();
    const uniqueEquipmentIds = [...new Set(equipmentIds)];

    const areaResult = await this.areaClient.getMany(uniqueAreaIds);
    const areaById = new Map(areaResult.found.map((a) => [a.id, a]));

    const workCenterResult = await this.workCenterClient.getMany(uniqueWorkCenterIds);
    const workCenterById = new Map(workCenterResult.found.map((l) => [l.id, l]));

    const equipmentResult = await this.equipmentClient.getMany(uniqueEquipmentIds);
    const equipmentById = new Map(equipmentResult.found.map((m) => [m.id, m]));

    const enriched = items.map(({ areaIds, workCenterIds, equipmentIds, ...rest }) => ({
      ...rest,
      areas: areaIds.map((id) => areaById.get(id)).filter((a): a is AreaSummary => a !== undefined),
      workCenters: workCenterIds
        .map((id) => workCenterById.get(id))
        .filter((a): a is WorkCenterSummary => a !== undefined),
      equipments: equipmentIds
        .map((id) => equipmentById.get(id))
        .filter((a): a is EquipmentSummary => a !== undefined),
    }));

    return { items: enriched, meta: buildPageMeta(page, size, totalElements) };
  }

  async findById(id: number): Promise<RejectReasonEnriched> {
    const dr = await this.rejectReasonReaderRepository.findById(id);
    if (!dr) throw new HTTPException(404, { message: "reason not found" });

    const { areaIds, workCenterIds, equipmentIds, ...rest } = dr;
    const uniqueAreaIds = [...new Set(areaIds)];
    const uniqueWorkCenterIds = [...new Set(workCenterIds)];
    const uniqueEquipmentIds = [...new Set(equipmentIds)];

    const areaResult = await this.areaClient.getMany(uniqueAreaIds);
    const areaById = new Map(areaResult.found.map((a) => [a.id, a]));

    const workCenterResult = await this.workCenterClient.getMany(uniqueWorkCenterIds);
    const workCenterById = new Map(workCenterResult.found.map((l) => [l.id, l]));

    const equipmentResult = await this.equipmentClient.getMany(uniqueEquipmentIds);
    const equipmentById = new Map(equipmentResult.found.map((m) => [m.id, m]));

    return {
      ...rest,
      areas: areaIds.map((id) => areaById.get(id)).filter((a): a is AreaSummary => a !== undefined),
      workCenters: workCenterIds
        .map((id) => workCenterById.get(id))
        .filter((a): a is WorkCenterSummary => a !== undefined),
      equipments: equipmentIds
        .map((id) => equipmentById.get(id))
        .filter((a): a is EquipmentSummary => a !== undefined),
    };
  }

  private async checkArea(ids: number[]) {
    const missingIds = await withLog(this.logger, "area_client_get_many", { ids }, async () => {
      const { missingIds } = await this.areaClient.getMany(ids);
      return missingIds;
    });

    if (missingIds.length > 0) {
      return new HTTPException(404, {
        message: `area with ids: ${missingIds.join(",")} not found`,
      });
    } else {
      return null;
    }
  }

  private async checkWorkCenter(ids: number[]) {
    const missingIds = await withLog(
      this.logger,
      "work_center_client_get_many",
      { ids: ids },
      async () => {
        const { missingIds } = await this.workCenterClient.getMany(ids);
        return missingIds;
      },
    );

    if (missingIds.length > 0) {
      return new HTTPException(404, {
        message: `work center with ids: ${missingIds.join(",")} not found`,
      });
    } else {
      return null;
    }
  }

  private async checkEquipment(ids: number[]) {
    const missingIds = await withLog(
      this.logger,
      "equipment_client_get_many",
      { ids },
      async () => {
        const { missingIds } = await this.equipmentClient.getMany(ids);
        return missingIds;
      },
    );

    if (missingIds.length > 0) {
      return new HTTPException(404, {
        message: `equipment with ids: ${missingIds.join(",")} not found`,
      });
    } else {
      return null;
    }
  }

  async create(input: CreateRejectReason): Promise<{ id: number }> {
    const errArea = await this.checkArea(input.areaIds);
    if (errArea !== null) {
      throw errArea;
    }

    const errWorkCenter = await this.checkWorkCenter(input.workCenterIds);
    if (errWorkCenter !== null) {
      throw errWorkCenter;
    }

    const errEquipment = await this.checkEquipment(input.equipmentIds);
    if (errEquipment !== null) {
      throw errEquipment;
    }

    return await withLog(this.logger, "reject_reason_create", { input }, () =>
      this.rejectReasonWriterRepository.create(input),
    );
  }

  async update(id: number, patch: UpdateRejectReason): Promise<{ id: number }> {
    const found = await this.rejectReasonReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "reason not found" });
    if (patch.areaIds) {
      const errArea = await this.checkArea(patch.areaIds);
      if (errArea !== null) {
        throw errArea;
      }
    }

    if (patch.workCenterIds) {
      const errWorkCenter = await this.checkWorkCenter(patch.workCenterIds);
      if (errWorkCenter !== null) {
        throw errWorkCenter;
      }
    }

    if (patch.equipmentIds) {
      const errEquipment = await this.checkEquipment(patch.equipmentIds);
      if (errEquipment !== null) {
        throw errEquipment;
      }
    }

    return await withLog(this.logger, "reject_reason_update", { id, patch }, () =>
      this.rejectReasonWriterRepository.update(id, patch),
    );
  }

  async delete(id: number): Promise<string> {
    const found = await this.rejectReasonReaderRepository.findById(id);
    if (!found) throw new HTTPException(404, { message: "reason not found" });
    await withLog(this.logger, "reject_reason_delete", { id }, () =>
      this.rejectReasonWriterRepository.delete(id),
    );

    return "ok";
  }
}

export { RejectReasonService };
export type { PagedRejectReasonResult, TRejectReasonService };
