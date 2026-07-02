import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type {
  CreateMachine,
  CreateSubMachine,
  ListMachineInput,
  ListSubMachineInput,
  Machine,
  PagedMachine,
  PagedSubMachine,
  SubMachine,
  UpdateMachine,
  UpdateSubMachine,
} from "./machine.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";
import { machineTable, subMachineTable } from "../../shared/database/schema/schema.js";
import {
  DuplicateMachineError,
  DuplicateSubMachineError,
  InvalidMachineLineIdReferenceError,
  InvalidSubMachineMachineIdReferenceError,
} from "./machine-errors.js";
import type { MachineSummary } from "@molca/contract-client";

type MachineReaderDeps = {
  db: PostgresDB;
  region: string;
};

type MachineWriterDeps = {
  db: PostgresDB;
  region: string;
};

type MachineReader = {
  findAll: (input: ListMachineInput) => Promise<PagedMachine>;
  findAllSub: (input: ListSubMachineInput) => Promise<PagedSubMachine>;
  findById: (id: number) => Promise<Machine | undefined>;
  findSubById: (id: number) => Promise<SubMachine | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<MachineSummary[]>;
};

type MachineWriter = {
  create: (machine: CreateMachine) => Promise<{ id: number }>;
  createSub: (subMachine: CreateSubMachine) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateMachine) => Promise<{ id: number }>;
  updateSub: (id: number, patch: UpdateSubMachine) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
  deleteSub: (id: number) => Promise<void>;
};

class MachineReaderRepository implements MachineReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: MachineReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll({ limit, offset, filter }: ListMachineInput): Promise<PagedMachine> {
    const baseConds = [eq(machineTable.region, this.region)];

    if (filter.lineId !== undefined) baseConds.push(eq(machineTable.lineId, filter.lineId));
    if (filter.isMain !== undefined) baseConds.push(eq(machineTable.isMain, filter.isMain));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(machineTable.name, pattern), ilike(machineTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: machineTable.id,
          code: machineTable.code,
          name: machineTable.name,
          lineId: machineTable.lineId,
          isMain: machineTable.isMain,
          region: machineTable.region,
          createdAt: machineTable.createdAt,
          updatedAt: machineTable.updatedAt,
        })
        .from(machineTable)
        .where(where)
        .orderBy(desc(machineTable.createdAt), asc(machineTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(machineTable.id) })
        .from(machineTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<Machine | undefined> {
    return await this.db.query.machineTable.findFirst({
      where: { id, region: this.region },
      with: {
        line: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAllSub({ limit, offset, filter }: ListSubMachineInput): Promise<PagedSubMachine> {
    const baseConds = [eq(subMachineTable.region, this.region)];

    if (filter.machineId !== undefined)
      baseConds.push(eq(subMachineTable.machineId, filter.machineId));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(subMachineTable.name, pattern), ilike(subMachineTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: subMachineTable.id,
          code: subMachineTable.code,
          name: subMachineTable.name,
          machineId: subMachineTable.machineId,
          region: subMachineTable.region,
          createdAt: subMachineTable.createdAt,
          updatedAt: subMachineTable.updatedAt,
        })
        .from(subMachineTable)
        .where(where)
        .orderBy(desc(subMachineTable.createdAt), asc(subMachineTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(subMachineTable.id) })
        .from(subMachineTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findSubById(id: number): Promise<SubMachine | undefined> {
    return await this.db.query.subMachineTable.findFirst({
      where: { id, region: this.region },
      with: {
        machine: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async existById(id: number): Promise<boolean> {
    const row = await this.db.query.machineTable.findFirst({
      where: { id, region: this.region },
    });

    return !!row;
  }

  async findSummariesByIds(ids: number[]): Promise<MachineSummary[]> {
    return await this.db.query.machineTable.findMany({
      where: {
        id: {
          in: ids,
        },
        region: this.region,
      },
      columns: { id: true, code: true, name: true },
    });
  }
}

class MachineWriterRepository implements MachineWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: MachineWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(machine: CreateMachine): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(machineTable)
        .values({
          code: machine.code,
          name: machine.name,
          lineId: machine.lineId,
          isMain: machine.isMain,
          region: this.region,
        })
        .returning({
          id: machineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateMachineError(machine.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidMachineLineIdReferenceError(machine.lineId);
      }
      throw err;
    }
  }

  async createSub(subMachine: CreateSubMachine): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(subMachineTable)
        .values({
          code: subMachine.code,
          name: subMachine.name,
          machineId: subMachine.machineId,
          region: this.region,
        })
        .returning({
          id: subMachineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateSubMachineError(subMachine.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidSubMachineMachineIdReferenceError(subMachine.machineId);
      }
      throw err;
    }
  }

  async update(id: number, patch: UpdateMachine): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(machineTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(machineTable.id, id), eq(machineTable.region, this.region)))
        .returning({
          id: machineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateMachineError(patch.name);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidMachineLineIdReferenceError(patch.lineId);
      }
      throw err;
    }
  }

  async updateSub(id: number, patch: UpdateSubMachine): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(subMachineTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(subMachineTable.id, id), eq(subMachineTable.region, this.region)))
        .returning({
          id: subMachineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateSubMachineError(patch.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidSubMachineMachineIdReferenceError(patch.machineId);
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(machineTable)
      .where(and(eq(machineTable.id, id), eq(machineTable.region, this.region)));
  }

  async deleteSub(id: number): Promise<void> {
    await this.db
      .delete(subMachineTable)
      .where(and(eq(subMachineTable.id, id), eq(subMachineTable.region, this.region)));
  }
}

export { MachineReaderRepository, MachineWriterRepository };
export type { MachineReaderDeps, MachineWriterDeps, MachineReader, MachineWriter };
