import { and, count, eq, ilike, or } from "drizzle-orm";

import {
  DuplicateHierarcyLineError,
  DuplicateHierarcyMachineError,
  DuplicateHierarcySubMachineError,
  InvalidHierarcyLineAreaIdReferenceError,
  InvalidHierarcyMachineLineIdReferenceError,
  InvalidHierarcySubMachineMachineIdReferenceError,
} from "./hierarcy-errors.js";
import { lineTable, machineTable, subMachineTable } from "../../shared/database/schema/schema.js";
import { isForeignKeyViolation, isUniqueViolation } from "../../shared/database/helper/catcher.js";

import type {
  CreateLineWithMachines,
  LineHierarcy,
  LineHierarcyInput,
  PagedLineHierarcy,
  CreateMachines,
  CreateSubMachines,
} from "./hierarcy.js";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";

type HieracyReaderDeps = {
  db: PostgresDB;
  region: string;
};

type HierarcyReader = {
  findLineHierarcy: (input: LineHierarcyInput) => Promise<PagedLineHierarcy>;
};

type HierarcyWriter = {
  createLine: (input: CreateLineWithMachines) => Promise<void>;
  createMachines: (lineId: number, machines: CreateMachines) => Promise<void>;
  createSubMachines: (machineId: number, machines: CreateSubMachines) => Promise<void>;
};

class HierarcyReaderRepository implements HierarcyReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: HieracyReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findLineHierarcy({ limit, offset, filter }: LineHierarcyInput): Promise<PagedLineHierarcy> {
    const baseConds = [eq(lineTable.region, this.region)];

    if (filter.areaId !== undefined) baseConds.push(eq(lineTable.areaId, filter.areaId));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(ilike(lineTable.name, pattern), ilike(lineTable.code, pattern));
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.lineTable.findMany({
        where: {
          region: this.region,
          ...(filter.areaId !== undefined ? { areaId: filter.areaId } : {}),
          ...(filter.q !== undefined
            ? {
                OR: [{ name: { ilike: `%${filter.q}%` } }, { code: { ilike: `%${filter.q}%` } }],
              }
            : {}),
        },
        orderBy: (l, { desc, asc }) => [desc(l.createdAt), asc(l.id)],
        limit,
        offset,
        columns: {
          id: true,
          name: true,
          code: true,
          category: true,
        },
        with: {
          area: {
            where: { region: this.region },
            columns: { id: true, name: true, displayName: true },
          },
          machines: {
            where: { region: this.region },
            columns: { id: true, code: true, name: true, isMain: true },
            with: {
              machines: {
                where: { region: this.region },
                columns: { id: true, code: true, name: true },
              },
            },
          },
        },
      }),
      this.db
        .select({ value: count(lineTable.id) })
        .from(lineTable)
        .where(where),
    ]);

    const items: LineHierarcy[] = rows.map((line) => ({
      lineId: line.id,
      lineName: line.name,
      lineCode: line.code,
      lineCategory: line.category,
      area: line.area
        ? {
            areaId: line.area.id,
            areaName: line.area.name,
            areaDisplayName: line.area.displayName,
          }
        : null,
      machines: line.machines.map((m) => ({
        machineId: m.id,
        machineCode: m.code,
        machineName: m.name,
        mainMachine: m.isMain,
        machines: m.machines.map((s) => ({
          machineId: s.id,
          machineCode: s.code,
          machineName: s.name,
        })),
      })),
    }));

    return { items, totalElements: totals[0]?.value ?? 0 };
  }
}

type LineShapeIn = Omit<CreateLineWithMachines, "machines">;

class HierarcyWriterRepository implements HierarcyWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: HieracyReaderDeps) {
    this.db = db;
    this.region = region;
  }

  private async insertLine(tx: Transaction, input: LineShapeIn): Promise<{ id: number }> {
    try {
      const [row] = await tx
        .insert(lineTable)
        .values({
          code: input.code,
          name: input.name,
          areaId: input.areaId,
          category: input.category,
          region: this.region,
        })
        .returning({
          id: lineTable.id,
        });

      return row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateHierarcyLineError(input.code);
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidHierarcyLineAreaIdReferenceError(input.areaId);
      }
      throw err;
    }
  }

  private async insertMachines(
    tx: Transaction | PostgresDB,
    lineId: number,
    machines: CreateMachines,
  ): Promise<void> {
    if (machines.length === 0) return;
    try {
      await tx.insert(machineTable).values(
        machines.map((m) => ({
          code: m.code,
          name: m.name,
          lineId,
          isMain: m.isMain,
          region: this.region,
        })),
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateHierarcyMachineError();
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidHierarcyMachineLineIdReferenceError(lineId);
      }
      throw err;
    }
  }

  private async insertSubMachines(
    tx: Transaction | PostgresDB,
    machineId: number,
    machines: CreateSubMachines,
  ): Promise<void> {
    if (machines.length === 0) return;
    try {
      await tx.insert(subMachineTable).values(
        machines.map((m) => ({
          code: m.code,
          name: m.name,
          machineId,
          region: this.region,
        })),
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateHierarcySubMachineError();
      }
      if (isForeignKeyViolation(err)) {
        throw new InvalidHierarcySubMachineMachineIdReferenceError(machineId);
      }
      throw err;
    }
  }

  async createLine(input: CreateLineWithMachines): Promise<void> {
    await this.db.transaction(async (tx) => {
      const { machines, ...lineShape } = input;
      const save = await this.insertLine(tx, lineShape);
      await this.insertMachines(tx, save.id, machines);
    });
  }

  async createMachines(lineId: number, input: CreateMachines): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.insertMachines(tx, lineId, input);
    });
  }

  async createSubMachines(machineId: number, input: CreateSubMachines): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.insertSubMachines(tx, machineId, input);
    });
  }
}

export { HierarcyReaderRepository, HierarcyWriterRepository };
export type { HierarcyReader, HierarcyWriter, HieracyReaderDeps };
