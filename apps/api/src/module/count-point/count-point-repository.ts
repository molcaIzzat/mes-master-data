import { and, count, eq } from "drizzle-orm";

import { InvalidCountPointferenceError } from "./count-point-errors.js";
import { FkViolationError, toPgConstraintError } from "../../shared/database/helper/catcher.js";
import { countPointTable } from "../../shared/database/schema/schema.js";

import type {
  CreateCountPoint,
  CountPoint,
  ListCountPointInput,
  PagedCountPoint,
  UpdateCountPoint,
} from "./count-point.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

type CountPointReaderDeps = {
  db: PostgresDB;
  region: string;
};

type CountPointWriterDeps = {
  db: PostgresDB;
  region: string;
};

type CountPointReader = {
  findManyByWorkUnitId: (
    workUnitId: number,
    input: ListCountPointInput,
  ) => Promise<PagedCountPoint>;
  findById: (id: number) => Promise<CountPoint | undefined>;
};

type CountPointWriter = {
  create: (input: CreateCountPoint) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateCountPoint) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class CountPointReaderRepository implements CountPointReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: CountPointReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    { limit, offset }: ListCountPointInput,
  ): Promise<PagedCountPoint> {
    const baseConds = [eq(countPointTable.region, this.region)];

    const where = and(...baseConds);
    const [rows, totals] = await Promise.all([
      this.db.query.countPointTable.findMany({
        where: {
          region: this.region,
          workUnitId,
        },
        orderBy: (wu, { desc, asc }) => [desc(wu.createdAt), asc(wu.id)],
        limit,
        offset,
        columns: {
          id: true,
          workUnitId: true,
          role: true,
          source: true,
          sourceTag: true,
        },
        with: {
          equipment: {
            columns: { id: true, code: true, name: true },
          },
          uom: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(countPointTable.id) })
        .from(countPointTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<CountPoint | undefined> {
    return await this.db.query.countPointTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        workUnitId: true,
        role: true,
        source: true,
        sourceTag: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        equipment: {
          columns: { id: true, code: true, name: true },
        },
        uom: {
          columns: { id: true, code: true, name: true },
        },
      },
    });
  }
}

class CountPointWriterRepository implements CountPointWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: CountPointWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(input: CreateCountPoint): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(countPointTable)
        .values({
          workUnitId: input.workUnitId,
          equipmentId: input.equipmentId,
          uomId: input.uomId,
          role: input.role,
          source: input.source,
          sourceTag: input.sourceTag,
          region: this.region,
        })
        .returning({
          id: countPointTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidCountPointferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateCountPoint): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(countPointTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(countPointTable.id, id), eq(countPointTable.region, this.region)))
        .returning({
          id: countPointTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidCountPointferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(countPointTable)
      .where(and(eq(countPointTable.id, id), eq(countPointTable.region, this.region)));
  }
}

export { CountPointReaderRepository, CountPointWriterRepository };
export type { CountPointReaderDeps, CountPointWriterDeps, CountPointReader, CountPointWriter };
