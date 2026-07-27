import { and, count, eq, inArray } from "drizzle-orm";
import { chunk } from "@molca/helper";

import { CountPointImportError, InvalidCountPointferenceError } from "./count-point-errors.js";
import { ROLE_LABELS, SOURCE_LABELS, parseCountRole, parseCountSource } from "./count-point.js";
import { FkViolationError, toPgConstraintError } from "../../shared/database/helper/catcher.js";
import { countPointTable, equipmentTable, unitTable } from "../../shared/database/schema/schema.js";

import type {
  CreateCountPoint,
  CountPoint,
  ImportCountPointIssue,
  ImportCountPointResult,
  ImportCountPointRow,
  ListCountPointInput,
  PagedCountPoint,
  UpdateCountPoint,
} from "./count-point.js";
import type { PostgresDB, Transaction } from "../../shared/database/postgres.js";

// Postgres caps a statement's parameters, and each row here binds seven of
// them; 500 rows a batch keeps a 1000-row file to two round trips.
const INSERT_BATCH = 500;

const MAX_SOURCE_TAG = 255;
const MIN_SOURCE_TAG = 3;

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
  importMany: (workUnitId: number, rows: ImportCountPointRow[]) => Promise<ImportCountPointResult>;
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
    const baseConds = [
      eq(countPointTable.region, this.region),
      eq(countPointTable.workUnitId, workUnitId),
    ];

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

  // Codes are what the spreadsheet carries, so both lookups run once for the
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

  private async resolveUnits(tx: Transaction, codes: string[]): Promise<Map<string, number>> {
    if (codes.length === 0) return new Map();

    const found = await tx
      .select({ id: unitTable.id, code: unitTable.code })
      .from(unitTable)
      .where(and(eq(unitTable.region, this.region), inArray(unitTable.code, codes)));

    return new Map(found.map((u) => [u.code, u.id]));
  }

  // Every row is checked before anything is written, and a single bad reference
  // aborts the whole file. Rows that already exist are left alone, which is what
  // makes re-uploading the same file a no-op.
  async importMany(
    workUnitId: number,
    rows: ImportCountPointRow[],
  ): Promise<ImportCountPointResult> {
    return await this.db.transaction(async (tx) => {
      const [equipments, units] = await Promise.all([
        this.resolveEquipments(tx, [
          ...new Set(rows.map((r) => r.equipmentCode.trim()).filter(Boolean)),
        ]),
        this.resolveUnits(tx, [...new Set(rows.map((r) => r.unitCode.trim()).filter(Boolean))]),
      ]);

      const issues: ImportCountPointIssue[] = [];
      const values: (typeof countPointTable.$inferInsert)[] = [];
      // role + source tag is the machine-scoped natural key, so a file that
      // repeats one would fight itself on insert.
      const seen = new Map<string, number>();

      rows.forEach((raw, index) => {
        const row = index + 1;
        const equipmentCode = raw.equipmentCode.trim();
        const unitCode = raw.unitCode.trim();
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

        let uomId: number | undefined;
        if (unitCode === "") {
          issues.push({
            row,
            column: "Unit Code",
            value: raw.unitCode,
            message: "Unit Code is required",
          });
        } else {
          uomId = units.get(unitCode);
          if (uomId === undefined) {
            issues.push({
              row,
              column: "Unit Code",
              value: unitCode,
              message: `Unit Code "${unitCode}" does not exist`,
            });
          }
        }

        const role = parseCountRole(raw.role);
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

        // A blank Source means the default, the same one a single create gets.
        const source = raw.source.trim() === "" ? "plc" : parseCountSource(raw.source);
        if (source === undefined) {
          issues.push({
            row,
            column: "Source",
            value: raw.source,
            message: `Source "${raw.source.trim()}" is not valid. Allowed: ${SOURCE_LABELS}`,
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
          const key = `${role} ${sourceTag}`;
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

        if (equipmentId !== undefined && uomId !== undefined && role && source && sourceTagOk) {
          values.push({
            workUnitId,
            equipmentId,
            uomId,
            role,
            source,
            sourceTag,
            region: this.region,
          });
        }
      });

      if (issues.length > 0) throw new CountPointImportError(issues);

      let created = 0;
      try {
        for (const batch of chunk(values, INSERT_BATCH)) {
          // Skipping on conflict is what keeps a re-upload idempotent, and it
          // stays correct when two imports of the same file overlap.
          const inserted = await tx
            .insert(countPointTable)
            .values(batch)
            .onConflictDoNothing({
              target: [countPointTable.workUnitId, countPointTable.role, countPointTable.sourceTag],
            })
            .returning({ id: countPointTable.id });

          created += inserted.length;
        }
      } catch (err) {
        const constraintError = toPgConstraintError(err);
        if (constraintError instanceof FkViolationError) {
          throw new InvalidCountPointferenceError(constraintError.column, constraintError.value);
        }
        throw err;
      }

      return { total: rows.length, created, skipped: rows.length - created };
    });
  }
}

export { CountPointReaderRepository, CountPointWriterRepository };
export type { CountPointReaderDeps, CountPointWriterDeps, CountPointReader, CountPointWriter };
