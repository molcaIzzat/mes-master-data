import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { OtherPointWriterRepository } from "./other-point-repository.js";
import { OtherPointImportError } from "./other-point-errors.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { ImportOtherPointRow } from "./other-point.js";

const WORK_UNIT_ID = 5;
const OTHER_WORK_UNIT_ID = 6;

// Rows come back positionally because drizzle reads selects in `rowMode: array`
// and maps them onto the projection.
type ResultRows = unknown[][];

type Canned = {
  // [id, code, workUnitId]
  equipments?: ResultRows;
  // [id] per row the insert actually wrote
  inserted?: ResultRows;
};

// Drives the repository against a client that answers the lookup from a script
// and records every statement, so the transaction can be asserted without a
// live database.
function repoWith(canned: Canned) {
  const statements: string[] = [];
  const client = {
    query: (config: string | { text: string }) => {
      const text = typeof config === "string" ? config : config.text;
      statements.push(text);

      let rows: ResultRows = [];
      if (text.includes('from "ms_core"."equipments"')) rows = canned.equipments ?? [];
      else if (text.includes('insert into "ms_core"."other_points"')) rows = canned.inserted ?? [];

      return Promise.resolve({ rows, fields: [], rowCount: rows.length });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;

  return { repo: new OtherPointWriterRepository({ db, region: "ID" }), statements };
}

function row(overrides: Partial<ImportOtherPointRow> = {}): ImportOtherPointRow {
  return {
    equipmentCode: "EQ-1",
    role: "downtime",
    dataType: "boolean",
    sourceTag: "PLC/FI2-L1/MITSUM-1/Machine_Stop",
    ...overrides,
  };
}

const inserts = (statements: string[]) =>
  statements.filter((s) => s.includes('insert into "ms_core"."other_points"'));

describe("OtherPointWriterRepository.importMany", () => {
  it("writes every resolved row and reports them as created", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      inserted: [[100], [101]],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [
      row(),
      row({ role: "reject", dataType: "uint16", sourceTag: "PLC/FI2-L1/MITSUM-1/Film_Joint" }),
    ]);

    expect(result).toEqual({ total: 2, created: 2, skipped: 0 });
    expect(inserts(statements)).toHaveLength(1);
    expect(statements).toContain("commit");
  });

  it("counts rows the unique key already holds as skipped, so a re-upload is a no-op", async () => {
    const { repo } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      // on conflict do nothing returned no ids: both rows were already there
      inserted: [],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [
      row(),
      row({ role: "reject", sourceTag: "PLC/FI2-L1/MITSUM-1/Film_Joint" }),
    ]);

    expect(result).toEqual({ total: 2, created: 0, skipped: 2 });
  });

  it("skips on conflict rather than failing the insert", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      inserted: [[100]],
    });

    await repo.importMany(WORK_UNIT_ID, [row()]);

    expect(inserts(statements)[0]).toContain("on conflict");
    expect(inserts(statements)[0]).toContain("do nothing");
  });

  it("collects every bad cell in the file and writes nothing", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [
        row(),
        row({ equipmentCode: "NOPE-1", sourceTag: "PLC/A" }),
        row({ role: "banana", sourceTag: "PLC/B" }),
        row({ dataType: "quantum", sourceTag: "PLC/C" }),
      ])
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(OtherPointImportError);
    const { issues } = err as OtherPointImportError;

    // One issue per bad cell, each pinned to the row it came from. The first
    // row was fine, so nothing is reported against it.
    expect(issues).toHaveLength(3);
    expect(issues[0]).toMatchObject({
      row: 2,
      column: "Equipment Code",
      value: "NOPE-1",
      message: 'Equipment Code "NOPE-1" does not exist',
    });
    expect(issues[1]).toMatchObject({ row: 3, column: "Role", value: "banana" });
    expect(issues[1].message).toContain("Downtime");
    expect(issues[2]).toMatchObject({ row: 4, column: "Data Type", value: "quantum" });
    expect(issues[2].message).toContain("uint16");

    // Nothing was written, and the transaction was rolled back.
    expect(inserts(statements)).toHaveLength(0);
    expect(statements).toContain("rollback");
  });

  it("tells an equipment on another machine apart from one that does not exist", async () => {
    const { repo } = repoWith({
      equipments: [[2, "EQ-ELSEWHERE", OTHER_WORK_UNIT_ID]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [row({ equipmentCode: "EQ-ELSEWHERE" })])
      .catch((e: unknown) => e);

    expect((err as OtherPointImportError).issues[0]).toMatchObject({
      row: 1,
      column: "Equipment Code",
      message: 'Equipment Code "EQ-ELSEWHERE" belongs to another machine',
    });
  });

  it("rejects two rows that share a role and source tag, naming the first", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [row(), row({ role: "reject" }), row()])
      .catch((e: unknown) => e);

    const { issues } = err as OtherPointImportError;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ row: 3, column: "Source Tag" });
    expect(issues[0].message).toContain("Duplicate of row 1");
    expect(inserts(statements)).toHaveLength(0);
  });

  it("accepts the labels the UI shows and the widths a PLC export spells", async () => {
    const { repo } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      inserted: [[100], [101]],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [
      row({ role: "Downtime", dataType: "BOOL" }),
      row({ role: "Reject Reason", dataType: "Word", sourceTag: "PLC/FI2-L1/Film_Joint" }),
    ]);

    expect(result.created).toBe(2);
  });

  it("defaults a blank data type to boolean rather than rejecting the row", async () => {
    const { repo } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      inserted: [[100]],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [row({ dataType: "" })]);

    expect(result).toEqual({ total: 1, created: 1, skipped: 0 });
  });

  it("reports a source tag that is too short instead of letting the column reject it", async () => {
    const { repo } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [row({ sourceTag: "ab" })])
      .catch((e: unknown) => e);

    expect((err as OtherPointImportError).issues[0]).toMatchObject({
      row: 1,
      column: "Source Tag",
      message: "Source Tag must be at least 3 characters",
    });
  });
});
