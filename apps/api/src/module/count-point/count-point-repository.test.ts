import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { CountPointWriterRepository } from "./count-point-repository.js";
import { CountPointImportError } from "./count-point-errors.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { ImportCountPointRow } from "./count-point.js";

const WORK_UNIT_ID = 5;
const OTHER_WORK_UNIT_ID = 6;

// Rows come back positionally because drizzle reads selects in `rowMode: array`
// and maps them onto the projection.
type ResultRows = unknown[][];

type Canned = {
  // [id, code, workUnitId]
  equipments?: ResultRows;
  // [id, code]
  units?: ResultRows;
  // [id] per row the insert actually wrote
  inserted?: ResultRows;
};

// Drives the repository against a client that answers the lookups from a script
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
      else if (text.includes('from "ms_core"."uom"')) rows = canned.units ?? [];
      else if (text.includes('insert into "ms_core"."count_points"')) rows = canned.inserted ?? [];

      return Promise.resolve({ rows, fields: [], rowCount: rows.length });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;

  return { repo: new CountPointWriterRepository({ db, region: "ID" }), statements };
}

function row(overrides: Partial<ImportCountPointRow> = {}): ImportCountPointRow {
  return {
    equipmentCode: "EQ-1",
    unitCode: "PCS",
    role: "good_output",
    source: "plc",
    sourceTag: "PLC/WC-01/Total",
    ...overrides,
  };
}

const inserts = (statements: string[]) =>
  statements.filter((s) => s.includes('insert into "ms_core"."count_points"'));

describe("CountPointWriterRepository.importMany", () => {
  it("writes every resolved row and reports them as created", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
      inserted: [[100], [101]],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [
      row({ sourceTag: "PLC/WC-01/Total" }),
      row({ role: "reject", sourceTag: "PLC/WC-01/Reject" }),
    ]);

    expect(result).toEqual({ total: 2, created: 2, skipped: 0 });
    expect(inserts(statements)).toHaveLength(1);
    expect(statements).toContain("commit");
  });

  it("counts rows the unique key already holds as skipped, so a re-upload is a no-op", async () => {
    const { repo } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
      // on conflict do nothing returned no ids: both rows were already there
      inserted: [],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [
      row({ sourceTag: "PLC/WC-01/Total" }),
      row({ role: "reject", sourceTag: "PLC/WC-01/Reject" }),
    ]);

    expect(result).toEqual({ total: 2, created: 0, skipped: 2 });
  });

  it("skips on conflict rather than failing the insert", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
      inserted: [[100]],
    });

    await repo.importMany(WORK_UNIT_ID, [row()]);

    expect(inserts(statements)[0]).toContain("on conflict");
    expect(inserts(statements)[0]).toContain("do nothing");
  });

  it("collects every bad reference in the file and writes nothing", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [
        row(),
        row({ equipmentCode: "NOPE-1", sourceTag: "PLC/WC-01/A" }),
        row({ unitCode: "NOPE-U", sourceTag: "PLC/WC-01/B" }),
        row({ role: "banana", sourceTag: "PLC/WC-01/C" }),
      ])
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CountPointImportError);
    const { issues } = err as CountPointImportError;

    // One issue per bad cell, each pinned to the row it came from. The first
    // row was fine, so nothing is reported against it.
    expect(issues).toHaveLength(3);
    expect(issues[0]).toMatchObject({
      row: 2,
      column: "Equipment Code",
      value: "NOPE-1",
      message: 'Equipment Code "NOPE-1" does not exist',
    });
    expect(issues[1]).toMatchObject({
      row: 3,
      column: "Unit Code",
      value: "NOPE-U",
      message: 'Unit Code "NOPE-U" does not exist',
    });
    expect(issues[2]).toMatchObject({ row: 4, column: "Role", value: "banana" });
    expect(issues[2].message).toContain("Good Output");

    // Nothing was written, and the transaction was rolled back.
    expect(inserts(statements)).toHaveLength(0);
    expect(statements).toContain("rollback");
  });

  it("tells an equipment on another machine apart from one that does not exist", async () => {
    const { repo } = repoWith({
      equipments: [[2, "EQ-ELSEWHERE", OTHER_WORK_UNIT_ID]],
      units: [[10, "PCS"]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [row({ equipmentCode: "EQ-ELSEWHERE" })])
      .catch((e: unknown) => e);

    expect((err as CountPointImportError).issues[0]).toMatchObject({
      row: 1,
      column: "Equipment Code",
      message: 'Equipment Code "EQ-ELSEWHERE" belongs to another machine',
    });
  });

  it("rejects two rows that share a role and source tag, naming the first", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [row(), row({ role: "reject" }), row()])
      .catch((e: unknown) => e);

    const { issues } = err as CountPointImportError;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ row: 3, column: "Source Tag" });
    expect(issues[0].message).toContain("Duplicate of row 1");
    expect(inserts(statements)).toHaveLength(0);
  });

  it("accepts the labels the UI shows and defaults a blank source to plc", async () => {
    const { repo, statements } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
      inserted: [[100]],
    });

    const result = await repo.importMany(WORK_UNIT_ID, [row({ role: "Good Output", source: "" })]);

    expect(result.created).toBe(1);
    expect(inserts(statements)[0]).toContain("on conflict");
  });

  it("reports a source tag that is too short instead of letting the column reject it", async () => {
    const { repo } = repoWith({
      equipments: [[1, "EQ-1", WORK_UNIT_ID]],
      units: [[10, "PCS"]],
    });

    const err = await repo
      .importMany(WORK_UNIT_ID, [row({ sourceTag: "ab" })])
      .catch((e: unknown) => e);

    expect((err as CountPointImportError).issues[0]).toMatchObject({
      row: 1,
      column: "Source Tag",
      message: "Source Tag must be at least 3 characters",
    });
  });
});
