import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { EdgeReaderRepository } from "./edge-repository.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";

// Drives the repository against a client that records statements instead of
// running them, so the compiled SQL can be asserted without a live database.
function capture(workCenterId: number) {
  const statements: string[] = [];
  const client = {
    query: (config: { text: string }) => {
      statements.push(config.text);
      return Promise.resolve({ rows: [], fields: [], rowCount: 0 });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;
  const repo = new EdgeReaderRepository({ db, region: "ID" });

  return repo.findAll(workCenterId).then(() => ({
    statements,
    rows: statements[0] ?? "",
  }));
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("EdgeReaderRepository.findAll", () => {
  it("resolves both endpoints in the one statement", async () => {
    const { statements, rows } = await capture(7);

    // No count query -- the endpoint returns every flow on the line at once.
    expect(statements).toHaveLength(1);
    // One lateral join per endpoint, both onto work_units.
    expect(occurrences(rows, '"ms_core"."work_units"')).toBe(2);
    expect(occurrences(rows, "row_to_json")).toBe(2);
    expect(rows).toContain('"from_work_unit_id"');
    expect(rows).toContain('"to_work_unit_id"');
  });

  it("scopes the flows by region and work center", async () => {
    const { rows } = await capture(7);

    expect(rows).toContain('"ms_core"."work_unit_flows"');
    expect(rows).toContain('"region"');
    expect(rows).toContain('"work_center_id"');
  });
});
