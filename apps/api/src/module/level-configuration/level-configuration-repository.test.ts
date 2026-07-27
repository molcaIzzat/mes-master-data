import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { LevelConfigurationReaderRepository } from "./level-configuration-repository.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { LevelConfigurationFilter } from "./level-configuration.js";

// Drives the repository against a client that records statements instead of
// running them, so the compiled SQL can be asserted without a live database.
function capture(filter: LevelConfigurationFilter) {
  const statements: string[] = [];
  const client = {
    query: (config: { text: string }) => {
      statements.push(config.text);
      return Promise.resolve({ rows: [], fields: [], rowCount: 0 });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;
  const repo = new LevelConfigurationReaderRepository({ db, region: "ID" });

  return repo.findAll({ limit: 10, offset: 0, filter }).then(() => {
    const [rows, count] = statements;
    return { statements, rows: rows ?? "", count: count ?? "" };
  });
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("LevelConfigurationReaderRepository.findAll", () => {
  it("loads the whole subtree in one statement instead of fanning out", async () => {
    const { statements, rows } = await capture({});

    // One query for the page of lines (subtree included), one for the count.
    expect(statements).toHaveLength(2);
    // Nested lateral aggregation: one json_agg for work units, one for equipments.
    expect(occurrences(rows, "json_agg")).toBe(2);
    expect(rows).toContain('"ms_core"."work_units"');
    expect(rows).toContain('"ms_core"."equipments"');
  });

  it("scopes both statements by region", async () => {
    const { rows, count } = await capture({});

    expect(rows).toContain('"d0"."region"');
    expect(count).toContain('"ms_core"."work_centers"."region"');
  });

  it("applies the area filter to the rows and the count alike", async () => {
    const { rows, count } = await capture({ areaId: 3 });

    expect(rows).toContain('"d0"."area_id"');
    expect(count).toContain('"ms_core"."work_centers"."area_id"');
  });

  it("searches work units and equipments as well as the line itself", async () => {
    const { rows, count } = await capture({ q: "weigher" });

    // One EXISTS for work units, one for equipments, in both statements.
    expect(occurrences(rows, "exists (select 1")).toBe(2);
    expect(occurrences(count, "exists (select 1")).toBe(2);

    // The subqueries have to correlate to the work center each statement is
    // scanning -- the relational query aliases its root table to "d0", the
    // count query does not alias at all.
    expect(occurrences(rows, '"work_center_id" = "d0"."id"')).toBe(2);
    expect(occurrences(count, '"work_center_id" = "ms_core"."work_centers"."id"')).toBe(2);
  });

  it("omits the search predicate entirely when no term is given", async () => {
    const { rows, count } = await capture({});

    expect(rows).not.toContain("exists (select 1");
    expect(count).not.toContain("exists (select 1");
  });
});
