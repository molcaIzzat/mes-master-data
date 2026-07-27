import { and, eq } from "drizzle-orm";

import { workUnitFlowTable } from "../../shared/database/schema/schema.js";

import type { CreateEdge, EdgeList, UpdateEdge } from "./edge.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import {
  FkViolationError,
  toPgConstraintError,
  UniqueViolationError,
} from "../../shared/database/helper/catcher.js";
import { DuplicateEdgeError, InvalidEdgeReferenceError } from "./edge-errors.js";

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
  update: (workCenterId: number, id: number, patch: UpdateEdge) => Promise<{ id: number }>;
  delete: (workCenterId: number, id: number) => Promise<void>;
};

class EdgeReaderRepository implements EdgeReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: EdgeReaderDeps) {
    this.db = db;
    this.region = region;
  }

  // Both endpoints come back nested: the relations define `from` and `to` as
  // aliased one-relations, so the two joins onto work_units are implicit.
  async findAll(workCenterId: number): Promise<EdgeList[]> {
    return await this.db.query.workUnitFlowTable.findMany({
      where: {
        region: this.region,
        workCenterId,
      },
      orderBy: (f, { desc, asc }) => [desc(f.createdAt), asc(f.id)],
      columns: {
        id: true,
        workCenterId: true,
      },
      with: {
        from: {
          columns: { id: true, code: true, name: true },
        },
        to: {
          columns: { id: true, code: true, name: true },
        },
      },
    });
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
      throw this.toDomainError(err);
    }
  }

  async update(workCenterId: number, id: number, patch: UpdateEdge): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(workUnitFlowTable)
        .set({
          fromWorkUnitId: patch.fromWorkUnitId,
          toWorkUnitId: patch.toWorkUnitId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workUnitFlowTable.id, id),
            eq(workUnitFlowTable.workCenterId, workCenterId),
            eq(workUnitFlowTable.region, this.region),
          ),
        )
        .returning({
          id: workUnitFlowTable.id,
        });

      return row;
    } catch (err) {
      throw this.toDomainError(err);
    }
  }

  // The (from, to) pair is unique and both sides are foreign keys, so a write
  // fails in exactly two interesting ways.
  private toDomainError(err: unknown): unknown {
    const constraintError = toPgConstraintError(err);
    if (constraintError instanceof UniqueViolationError) {
      return new DuplicateEdgeError();
    }
    if (constraintError instanceof FkViolationError) {
      return new InvalidEdgeReferenceError(constraintError.column, constraintError.value);
    }
    return err;
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
