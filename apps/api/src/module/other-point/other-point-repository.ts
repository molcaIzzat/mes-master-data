import { and, count, eq, inArray } from "drizzle-orm";
import { chunk } from "@molca/helper";

import { OtherPointImportError, InvalidOtherPointReferenceError } from "./other-point-errors.js";
import {
  DATA_TYPE_LABELS,
  ROLE_LABELS,
  parseOtherDataType,
  parseOtherRole,
} from "./other-point.js";
import { FkViolationError, toPgConstraintError } from "../../shared/database/helper/catcher.js";
import { equipmentTable, otherPointTable } from "../../shared/database/schema/schema.js";

import type {
  CreateOtherPoint,
  OtherPoint,
  ImportOtherPointIssue,
  ImportOtherPointResult,
  ImportOtherPointRow,
  ListOtherPointInput,
  PagedOtherPoint,
  UpdateOtherPoint,
} from "./other-point.js";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";

// Postgres caps a statement's parameters, and each row here binds six of them;
// 500 rows a batch keeps a 1000-row file to two round trips.
const INSERT_BATCH = 500;

const MAX_SOURCE_TAG = 255;
const MIN_SOURCE_TAG = 3;

type OtherPointReaderDeps = {
  db: PostgresDB;
  region: string;
};

type OtherPointWriterDeps = {
  db: PostgresDB;
  region: string;
};

type OtherPointReader = {
  findManyByWorkUnitId: (
    workUnitId: number,
    input: ListOtherPointInput,
  ) => Promise<PagedOtherPoint>;
  findById: (id: number) => Promise<OtherPoint | undefined>;
};

type OtherPointWriter = {
  create: (input: CreateOtherPoint) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateOtherPoint) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
  importMany: (workUnitId: number, rows: ImportOtherPointRow[]) => Promise<ImportOtherPointResult>;
};

class OtherPointReaderRepository implements OtherPointReader {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: OtherPointReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findManyByWorkUnitId(
    workUnitId: number,
    { limit, offset }: ListOtherPointInput,
  ): Promise<PagedOtherPoint> {
    const where = and(
      eq(otherPointTable.region, this.region),
      eq(otherPointTable.workUnitId, workUnitId),
    );

    const [rows, totals] = await Promise.all([
      this.db.query.otherPointTable.findMany({
        where: {
          region: this.region,
          workUnitId,
        },
        orderBy: (op, { desc, asc }) => [desc(op.createdAt), asc(op.id)],
        limit,
        offset,
        columns: {
          id: true,
          workUnitId: true,
          role: true,
          dataType: true,
          sourceTag: true,
        },
        with: {
          equipment: {
            columns: { id: true, code: true, name: true },
          },
        },
      }),
      this.db
        .select({ value: count(otherPointTable.id) })
        .from(otherPointTable)
        .where(where),
    ]);

    return { items: rows, totalElements: totals[0]?.value ?? 0 };
  }

  async findById(id: number): Promise<OtherPoint | undefined> {
    return await this.db.query.otherPointTable.findFirst({
      where: { id, region: this.region },
      columns: {
        id: true,
        workUnitId: true,
        role: true,
        dataType: true,
        sourceTag: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        equipment: {
          columns: { id: true, code: true, name: true },
        },
      },
    });
  }
}

class OtherPointWriterRepository implements OtherPointWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: OtherPointWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(input: CreateOtherPoint): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .insert(otherPointTable)
        .values({
          workUnitId: input.workUnitId,
          equipmentId: input.equipmentId,
          role: input.role,
          dataType: input.dataType,
          sourceTag: input.sourceTag,
          region: this.region,
        })
        .returning({
          id: otherPointTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidOtherPointReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async update(id: number, patch: UpdateOtherPoint): Promise<{ id: number }> {
    try {
      const [row] = await this.db
        .update(otherPointTable)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(and(eq(otherPointTable.id, id), eq(otherPointTable.region, this.region)))
        .returning({
          id: otherPointTable.id,
        });

      return row;
    } catch (err) {
      const constraintError = toPgConstraintError(err);
      if (constraintError instanceof FkViolationError) {
        throw new InvalidOtherPointReferenceError(constraintError.column, constraintError.value);
      } else {
        throw err;
      }
    }
  }

  async delete(id: number): Promise<void> {
    await this.db
      .delete(otherPointTable)
      .where(and(eq(otherPointTable.id, id), eq(otherPointTable.region, this.region)));
  }

  // Codes are what the spreadsheet carries, so the lookup runs once for the
  // whole file rather than per row.
  private async resolveEquipments(
    tx: Transaction,
    codes: string[],
  ): Promise<Map<string, { id: number; workUnitId: number }>> {
    if (codes.length === 0) return new Map();

    // Deliberately not scoped to the work unit: an equipment that exists but
    // sits on another machine deserves a different message than one that does
    // not exist at all.
    const found = await tx
      .select({
        id: equipmentTable.id,
        code: equipmentTable.code,
        workUnitId: equipmentTable.workUnitId,
      })
      .from(equipmentTable)
      .where(and(eq(equipmentTable.region, this.region), inArray(equipmentTable.code, codes)));

    return new Map(found.map((e) => [e.code, { id: e.id, workUnitId: e.workUnitId }]));
  }

  // Every row is checked before anything is written, and a single bad reference
  // aborts the whole file. Rows that already exist are left alone, which is what
  // makes re-uploading the same file a no-op.
  async importMany(
    workUnitId: number,
    rows: ImportOtherPointRow[],
  ): Promise<ImportOtherPointResult> {
    return await this.db.transaction(async (tx) => {
      const equipments = await this.resolveEquipments(tx, [
        ...new Set(rows.map((r) => r.equipmentCode.trim()).filter(Boolean)),
      ]);

      const issues: ImportOtherPointIssue[] = [];
      const values: (typeof otherPointTable.$inferInsert)[] = [];
      // role + source tag is the machine-scoped natural key, so a file that
      // repeats one would fight itself on insert.
      const seen = new Map<string, number>();

      rows.forEach((raw, index) => {
        const row = index + 1;
        const equipmentCode = raw.equipmentCode.trim();
        const sourceTag = raw.sourceTag.trim();

        let equipmentId: number | undefined;
        if (equipmentCode === "") {
          issues.push({
            row,
            column: "Equipment Code",
            value: raw.equipmentCode,
            message: "Equipment Code is required",
          });
        } else {
          const equipment = equipments.get(equipmentCode);
          if (!equipment) {
            issues.push({
              row,
              column: "Equipment Code",
              value: equipmentCode,
              message: `Equipment Code "${equipmentCode}" does not exist`,
            });
          } else if (equipment.workUnitId !== workUnitId) {
            issues.push({
              row,
              column: "Equipment Code",
              value: equipmentCode,
              message: `Equipment Code "${equipmentCode}" belongs to another machine`,
            });
          } else {
            equipmentId = equipment.id;
          }
        }

        const role = parseOtherRole(raw.role);
        if (role === undefined) {
          issues.push({
            row,
            column: "Role",
            value: raw.role,
            message:
              raw.role.trim() === ""
                ? `Role is required. Allowed: ${ROLE_LABELS}`
                : `Role "${raw.role.trim()}" is not valid. Allowed: ${ROLE_LABELS}`,
          });
        }

        // A blank Data Type means the default, the same one a single create
        // gets: reason signals are booleans far more often than anything else.
        const dataType = raw.dataType.trim() === "" ? "boolean" : parseOtherDataType(raw.dataType);
        if (dataType === undefined) {
          issues.push({
            row,
            column: "Data Type",
            value: raw.dataType,
            message: `Data Type "${raw.dataType.trim()}" is not valid. Allowed: ${DATA_TYPE_LABELS}`,
          });
        }

        let sourceTagOk = true;
        if (sourceTag.length < MIN_SOURCE_TAG) {
          sourceTagOk = false;
          issues.push({
            row,
            column: "Source Tag",
            value: raw.sourceTag,
            message: `Source Tag must be at least ${MIN_SOURCE_TAG} characters`,
          });
        } else if (sourceTag.length > MAX_SOURCE_TAG) {
          sourceTagOk = false;
          issues.push({
            row,
            column: "Source Tag",
            value: sourceTag,
            message: `Source Tag must be at most ${MAX_SOURCE_TAG} characters`,
          });
        }

        if (role !== undefined && sourceTagOk) {
          const key = `${role} ${sourceTag}`;
          const firstRow = seen.get(key);
          if (firstRow !== undefined) {
            issues.push({
              row,
              column: "Source Tag",
              value: sourceTag,
              message: `Duplicate of row ${firstRow} — same Role and Source Tag`,
            });
          } else {
            seen.set(key, row);
          }
        }

        if (equipmentId !== undefined && role && dataType && sourceTagOk) {
          values.push({
            workUnitId,
            equipmentId,
            role,
            dataType,
            sourceTag,
            region: this.region,
          });
        }
      });

      if (issues.length > 0) throw new OtherPointImportError(issues);

      let created = 0;
      try {
        for (const batch of chunk(values, INSERT_BATCH)) {
          // Skipping on conflict is what keeps a re-upload idempotent, and it
          // stays correct when two imports of the same file overlap.
          const inserted = await tx
            .insert(otherPointTable)
            .values(batch)
            .onConflictDoNothing({
              target: [otherPointTable.workUnitId, otherPointTable.role, otherPointTable.sourceTag],
            })
            .returning({ id: otherPointTable.id });

          created += inserted.length;
        }
      } catch (err) {
        const constraintError = toPgConstraintError(err);
        if (constraintError instanceof FkViolationError) {
          throw new InvalidOtherPointReferenceError(constraintError.column, constraintError.value);
        }
        throw err;
      }

      return { total: rows.length, created, skipped: rows.length - created };
    });
  }
}

export { OtherPointReaderRepository, OtherPointWriterRepository };
export type { OtherPointReaderDeps, OtherPointWriterDeps, OtherPointReader, OtherPointWriter };
