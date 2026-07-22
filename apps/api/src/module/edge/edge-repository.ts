import { and, asc, desc, eq } from "drizzle-orm";

import { workUnitFlowTable } from "../../shared/database/schema/schema.js";

import type { CreateEdge, EdgeList } from "./edge.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import { FkViolationError, toPgConstraintError } from "../../shared/database/helper/catcher.js";
import { InvalidEdgeReferenceError } from "./edge-errors.js";

type EdgeReaderDeps = {
  db: PostgresDB;
  region: string;
};

type EdgeWriterDeps = {
  db: PostgresDB;
  region: string;
};

type EdgeReader = {
  findAll: (workCenterId: number) => Promise<EdgeList[]>;
  existById: (workCenterId: number, id: number) => Promise<boolean>;
};

type EdgeWriter = {
  create: (edge: CreateEdge) => Promise<{ id: number }>;
  delete: (workCenterId: number, id: number) => Promise<void>;
};

class EdgeReaderRepository implements EdgeReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EdgeReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll(workCenterId: number): Promise<EdgeList[]> {
    const baseConds = [
      eq(workUnitFlowTable.region, this.region),
      eq(workUnitFlowTable.workCenterId, workCenterId),
    ];

    const where = and(...baseConds);
    const rows = await this.db
      .select({
        id: workUnitFlowTable.id,
        workCenterId: workUnitFlowTable.workCenterId,
        fromWorkUnitId: workUnitFlowTable.fromWorkUnitId,
        toWorkUnitId: workUnitFlowTable.toWorkUnitId,
      })
      .from(workUnitFlowTable)
      .where(where)
      .orderBy(desc(workUnitFlowTable.createdAt), asc(workUnitFlowTable.id));

    return rows;
  }

  async existById(workCenterId: number, id: number): Promise<boolean> {
    const row = await this.db.query.workUnitFlowTable.findFirst({
      where: { id, region: this.region, workCenterId },
    });

    return !!row;
  }
}

class EdgeWriterRepository implements EdgeWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EdgeWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(edge: CreateEdge): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(workUnitFlowTable)
        .values({
          workCenterId: edge.workCenterId,
          fromWorkUnitId: edge.fromWorkUnitId,
          toWorkUnitId: edge.toWorkUnitId,
          region: this.region,
        })
        .returning({
          id: workUnitFlowTable.id,
        });

      return row;
    } catch (err) {
      console.log(err);
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidEdgeReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async delete(workCenterId: number, id: number): Promise<void> {
    await this.db
      .delete(workUnitFlowTable)
      .where(
        and(
          eq(workUnitFlowTable.id, id),
          eq(workUnitFlowTable.workCenterId, workCenterId),
          eq(workUnitFlowTable.region, this.region),
        ),
      );
  }
}

export { EdgeReaderRepository, EdgeWriterRepository };
export type { EdgeReaderDeps, EdgeWriterDeps, EdgeReader, EdgeWriter };
