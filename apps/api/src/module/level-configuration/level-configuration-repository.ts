import { and, count, EmptyFilter, eq, exists, ilike, or, sql } from "drizzle-orm";

import {
  equipmentTable,
  workCenterTable,
  workUnitTable,
} from "../../shared/database/schema/schema.js";

import type { SQL } from "drizzle-orm";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type {
  LevelConfigurationFilter,
  ListLevelConfigurationInput,
  PagedLevelConfiguration,
} from "./level-configuration.js";

type LevelConfigurationReaderDeps = {
  db: PostgresDB;
  region: string;
};

type LevelConfigurationReader = {
  findAll: (input: ListLevelConfigurationInput) => Promise<PagedLevelConfiguration>;
};

// The relational query aliases the root table, so the predicate has to be built
// against whichever table instance it is applied to rather than the imported one.
type WorkCenterTable = typeof workCenterTable;

class LevelConfigurationReaderRepository implements LevelConfigurationReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: LevelConfigurationReaderDeps) {
    this.db = db;
    this.region = region;
  }

  // Built once and handed to both the row query and the count query so the two
  // can never drift apart.
  private buildWhere(wc: WorkCenterTable, filter: LevelConfigurationFilter): SQL | undefined {
    const conds: SQL[] = [eq(wc.region, this.region)];

    if (filter.areaId !== undefined) conds.push(eq(wc.areaId, filter.areaId));

    if (filter.q !== undefined) {
      const pattern = `%${filter.q}%`;

      // A line also matches when one of its work units matches...
      const matchesWorkUnit = exists(
        this.db
          .select({ one: sql`1` })
          .from(workUnitTable)
          .where(
            and(
              eq(workUnitTable.workCenterId, wc.id),
              eq(workUnitTable.region, this.region),
              or(ilike(workUnitTable.name, pattern), ilike(workUnitTable.code, pattern)),
            ),
          ),
      );

      // ...or one of the equipments beneath those work units.
      const matchesEquipment = exists(
        this.db
          .select({ one: sql`1` })
          .from(equipmentTable)
          .innerJoin(workUnitTable, eq(equipmentTable.workUnitId, workUnitTable.id))
          .where(
            and(
              eq(workUnitTable.workCenterId, wc.id),
              eq(equipmentTable.region, this.region),
              or(ilike(equipmentTable.name, pattern), ilike(equipmentTable.code, pattern)),
            ),
          ),
      );

      const qOr = or(
        ilike(wc.name, pattern),
        ilike(wc.code, pattern),
        matchesWorkUnit,
        matchesEquipment,
      );
      if (qOr !== undefined) conds.push(qOr);
    }

    return and(...conds);
  }

  async findAll({
    limit,
    offset,
    filter,
  }: ListLevelConfigurationInput): Promise<PagedLevelConfiguration> {
    const [rows, totals] = await Promise.all([
      // Nested `with` compiles to a single lateral-join query, so the whole
      // subtree for this page costs one round trip instead of N+1.
      this.db.query.workCenterTable.findMany({
        where: { RAW: (wc) => this.buildWhere(wc, filter) ?? EmptyFilter },
        orderBy: (wc, { desc, asc }) => [desc(wc.createdAt), asc(wc.id)],
        limit,
        offset,
        columns: { id: true, code: true, name: true },
        with: {
          area: {
            columns: { id: true, code: true, name: true },
          },
          class: {
            columns: { id: true, code: true, name: true },
          },
          units: {
            columns: { id: true, code: true, name: true },
            orderBy: (wu, { asc }) => [asc(wu.name), asc(wu.id)],
            with: {
              class: {
                columns: { id: true, code: true, name: true },
              },
              equipments: {
                columns: { id: true, code: true, name: true, productSignalTag: true },
                orderBy: (equipment, { asc }) => [asc(equipment.name), asc(equipment.id)],
                with: {
                  class: {
                    columns: { id: true, code: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.db
        .select({ value: count(workCenterTable.id) })
        .from(workCenterTable)
        .where(this.buildWhere(workCenterTable, filter)),
    ]);

    // `units` is the relation name; the API contract exposes it as `workUnits`.
    const items = rows.map(({ units, ...line }) => ({ ...line, workUnits: units }));

    return { items, totalElements: totals[0]?.value ?? 0 };
  }
}

export { LevelConfigurationReaderRepository };
export type { LevelConfigurationReaderDeps, LevelConfigurationReader };
