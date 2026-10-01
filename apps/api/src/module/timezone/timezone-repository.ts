import type { PostgresDB } from "../../shared/database/postgres.js";
import type { WorkCenterChain, WorkUnitChain } from "./timezone.js";

type TimezoneReaderDeps = {
  db: PostgresDB;
  region: string;
};

type TimezoneReader = {
  findWorkUnitChain: (id: number) => Promise<WorkUnitChain | undefined>;
  findWorkCenterChain: (id: number) => Promise<WorkCenterChain | undefined>;
};

// Only the columns the answer is built from. Every level above `site` is walked
// for its FK alone, so `id` is selected purely to keep the row shape readable in
// a log — nothing downstream reads it.
const SITE_COLUMNS = { id: true, code: true, timezone: true } as const;

class TimezoneReaderRepository implements TimezoneReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: TimezoneReaderDeps) {
    this.db = db;
    this.region = region;
  }

  // Nested `with` compiles to a single lateral-join query, so the whole four-level
  // walk costs ONE round trip rather than the four sequential GETs a consumer
  // would otherwise have to make.
  //
  // The nested `where: { region }` filters are load-bearing, not decoration: a
  // relational `with` joins on the foreign key alone, so without them a work unit
  // whose parent belongs to another tenant would happily resolve to that tenant's
  // zone. With them the join yields null, which the service turns into a 409.
  async findWorkUnitChain(id: number): Promise<WorkUnitChain | undefined> {
    return await this.db.query.workUnitTable.findFirst({
      where: { id, region: this.region },
      columns: { id: true },
      with: {
        workCenter: {
          columns: { id: true },
          where: { region: this.region },
          with: {
            area: {
              columns: { id: true },
              where: { region: this.region },
              with: {
                site: {
                  columns: SITE_COLUMNS,
                  where: { region: this.region },
                },
              },
            },
          },
        },
      },
    });
  }

  // The same walk one level shorter. A work center belongs to exactly one area
  // and therefore one site — the same site every one of its work units resolves
  // to — so the two entry points can never disagree.
  async findWorkCenterChain(id: number): Promise<WorkCenterChain | undefined> {
    return await this.db.query.workCenterTable.findFirst({
      where: { id, region: this.region },
      columns: { id: true },
      with: {
        area: {
          columns: { id: true },
          where: { region: this.region },
          with: {
            site: {
              columns: SITE_COLUMNS,
              where: { region: this.region },
            },
          },
        },
      },
    });
  }
}

export { TimezoneReaderRepository };
export type { TimezoneReader, TimezoneReaderDeps };
