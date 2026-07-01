import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type {
  DowntimeReason,
  ListDowntimeReasonInput,
  PagedDowntimeReason,
} from "./downtime-reason.js";
import {
  downtimeReasonAreaTable,
  downtimeReasonLineTable,
  downtimeReasonMachineTable,
  downtimeReasonTable,
} from "../../shared/database/schema/schema.js";

type DowntimeReasonReaderDeps = {
  db: PostgresDB;
  region: string;
};

type DowntimeReasonWriterDeps = {
  db: PostgresDB;
  region: string;
};

type DowntimeReasonReader = {
  findAll: (input: ListDowntimeReasonInput) => Promise<PagedDowntimeReason>;
  findById: (id: number) => Promise<DowntimeReason | undefined>;
};

type DowntimeReasonWriter = {};

class DowntimeReasonReaderRepository implements DowntimeReasonReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: DowntimeReasonReaderDeps) {
    this.db = db;
    this.region = region;
  }

  private areaAgg() {
    return this.db.$with("area_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonAreaTable.reasonId,
          areaIds: sql<number[]>`ARRAY_AGG(${downtimeReasonAreaTable.areaId})`.as("areaIds"),
        })
        .from(downtimeReasonAreaTable)
        .groupBy(downtimeReasonAreaTable.reasonId),
    );
  }

  private lineAgg() {
    return this.db.$with("line_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonLineTable.reasonId,
          lineIds: sql<number[]>`ARRAY_AGG(${downtimeReasonLineTable.lineId})`.as("lineIds"),
        })
        .from(downtimeReasonLineTable)
        .groupBy(downtimeReasonLineTable.reasonId),
    );
  }

  private machineAgg() {
    return this.db.$with("machine_agg").as(
      this.db
        .select({
          reasonId: downtimeReasonMachineTable.reasonId,
          machineIds: sql<number[]>`ARRAY_AGG(${downtimeReasonMachineTable.machineId})`.as(
            "machineIds",
          ),
        })
        .from(downtimeReasonMachineTable)
        .groupBy(downtimeReasonMachineTable.reasonId),
    );
  }

  async findAll({ limit, offset, filter }: ListDowntimeReasonInput): Promise<PagedDowntimeReason> {
    const baseConds = [eq(downtimeReasonTable.region, this.region)];

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;
      const qOr = or(
        ilike(downtimeReasonTable.name, pattern),
        ilike(downtimeReasonTable.code, pattern),
      );
      if (qOr !== undefined) baseConds.push(qOr);
    }

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db
        .with(this.areaAgg(), this.lineAgg(), this.machineAgg())
        .select({
          id: downtimeReasonTable.id,
          name: downtimeReasonTable.name,
          code: downtimeReasonTable.code,
          category: downtimeReasonTable.category,
          region: downtimeReasonTable.region,
          createdAt: downtimeReasonTable.createdAt,
          areaIds: sql<number[]>`COALESCE(${this.areaAgg().areaIds}, ARRAY[]::int[])`,
          lineIds: sql<number[]>`COALESCE(${this.lineAgg().lineIds}, ARRAY[]::int[])`,
          machineIds: sql<number[]>`COALESCE(${this.machineAgg().machineIds}, ARRAY[]::int[])`,
        })
        .from(downtimeReasonTable)
        .leftJoin(this.areaAgg(), eq(downtimeReasonTable.id, this.areaAgg().reasonId))
        .leftJoin(this.lineAgg(), eq(downtimeReasonTable.id, this.lineAgg().reasonId))
        .leftJoin(this.machineAgg(), eq(downtimeReasonTable.id, this.machineAgg().reasonId))
        .where(where)
        .orderBy(desc(downtimeReasonTable.createdAt), asc(downtimeReasonTable.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count(downtimeReasonTable.id) })
        .from(downtimeReasonTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<DowntimeReason | undefined> {
    const row = await this.db.query.downtimeReasonTable.findFirst({
      where: { id, region: this.region },
      with: {
        areas: {
          columns: { areaId: true },
        },
        lines: {
          columns: { lineId: true },
        },
        machines: {
          columns: { machineId: true },
        },
      },
    });

    if (!row) {
      return undefined;
    }

    return {
      ...row,
      areaIds: row.areas.map((area) => area.areaId),
      lineIds: row.lines.map((line) => line.lineId),
      machineIds: row.machines.map((machine) => machine.machineId),
    };
  }
}

class DowntimeReasonWriterRepository implements DowntimeReasonWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: DowntimeReasonWriterDeps) {
    this.db = db;
    this.region = region;
  }
}

export { DowntimeReasonReaderRepository, DowntimeReasonWriterRepository };
export type {
  DowntimeReasonReaderDeps,
  DowntimeReasonWriterDeps,
  DowntimeReasonReader,
  DowntimeReasonWriter,
};
