import { HTTPException } from "hono/http-exception";
import { buildPageMeta } from "@molca/network";
import { baseLogger, getRequestContext } from "@molca/observability";

import type { PagedResult } from "@molca/network";
import { withLog, type Logger } from "@molca/utils";
import type {
  AreaClientContract,
  AreaSummary,
  LineClientContract,
  LineSummary,
  MachineClientContract,
  MachineSummary,
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
  lineClient: LineClientContract;
  machineClient: MachineClientContract;
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
  private lineClient: LineClientContract;
  private machineClient: MachineClientContract;
  private fallbackLogger: Logger;

  constructor({
    rejectReasonReaderRepository,
    rejectReasonWriterRepository,
    areaClient,
    lineClient,
    machineClient,
    logger,
  }: RejectReasonServiceDeps) {
    this.rejectReasonReaderRepository = rejectReasonReaderRepository;
    this.rejectReasonWriterRepository = rejectReasonWriterRepository;
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

  async findById(id: number): Promise<RejectReasonEnriched> {
    const dr = await this.rejectReasonReaderRepository.findById(id);
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

  private async checkLine(ids: number[]) {
    const missingIds = await withLog(
      this.logger,
      "line_client_get_many",
      { ids: ids },
      async () => {
        const { missingIds } = await this.lineClient.getMany(ids);
        return missingIds;
      },
    );

    if (missingIds.length > 0) {
      return new HTTPException(404, {
        message: `line with ids: ${missingIds.join(",")} not found`,
      });
    } else {
      return null;
    }
  }

  private async checkMachine(ids: number[]) {
    const missingIds = await withLog(this.logger, "machine_client_get_many", { ids }, async () => {
      const { missingIds } = await this.machineClient.getMany(ids);
      return missingIds;
    });

    if (missingIds.length > 0) {
      return new HTTPException(404, {
        message: `machine with ids: ${missingIds.join(",")} not found`,
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

    const errLine = await this.checkLine(input.lineIds);
    if (errLine !== null) {
      throw errLine;
    }

    const errMachine = await this.checkMachine(input.machineIds);
    if (errMachine !== null) {
      throw errMachine;
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

    if (patch.lineIds) {
      const errLine = await this.checkLine(patch.lineIds);
      if (errLine !== null) {
        throw errLine;
      }
    }

    if (patch.machineIds) {
      const errMachine = await this.checkMachine(patch.machineIds);
      if (errMachine !== null) {
        throw errMachine;
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
