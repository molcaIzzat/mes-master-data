import { and, count, eq, ilike, or } from "drizzle-orm";

import { lineTable } from "../../shared/database/schema/schema.js";

import type { LineHierarcy, LineHierarcyInput, PagedLineHierarcy } from "./hierarcy.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type HieracyReaderDeps = {
  db: PostgresDB;
  region: string;
};

type HierarcyReader = {
  findLineHierarcy: (input: LineHierarcyInput) => Promise<PagedLineHierarcy>;
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

export { HierarcyReaderRepository };
export type { HierarcyReader, HieracyReaderDeps };
