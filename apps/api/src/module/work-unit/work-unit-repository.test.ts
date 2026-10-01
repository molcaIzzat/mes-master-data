import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { WorkUnitReaderRepository } from "./work-unit-repository.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { WorkUnitFilter } from "./work-unit.js";

// findAll fires two statements in parallel — the relational page query and the
// count query — and each expresses the filter in a DIFFERENT dialect. Driving a
// recording client lets both compiled statements be asserted, which is the only
// way to catch a predicate that was added to one and forgotten in the other.
//
//   findAll(filter)
//     ├─ db.query.workUnitTable.findMany({ where: { id: { in: [...] } } })  -> statements[?]
//     └─ db.select(count()).where(and(..., inArray(id, [...])))             -> statements[?]
//
// Order within the pair is not guaranteed, so assertions look at BOTH.
async function capture(filter: WorkUnitFilter) {
  const statements: string[] = [];
  const params: unknown[][] = [];

  // node-postgres takes the bound values as the SECOND argument, not as a key
  // on the config object — reading `config.values` yields undefined and makes
  // every parameter assertion vacuously pass against an empty array.
  const client = {
    query: (config: { text: string }, values?: unknown[]) => {
      statements.push(config.text);
      params.push(values ?? []);
      return Promise.resolve({ rows: [], fields: [], rowCount: 0 });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;
  const repo = new WorkUnitReaderRepository({ db, region: "ID" });

  await repo.findAll({ limit: 10, offset: 0, filter });

  return { statements, params, all: statements.join("\n---\n") };
}

describe("WorkUnitReaderRepository.findAll ids filter", () => {
  it("issues exactly two statements: the page and the count", async () => {
    const { statements } = await capture({ ids: [1, 2, 3] });

    expect(statements).toHaveLength(2);
  });

  it("constrains BOTH statements by id when ids is given", async () => {
    const { statements } = await capture({ ids: [1, 2, 3] });

    // If only one carried the predicate, the page would be filtered while the
    // reported totalElements counted the whole region.
    for (const sql of statements) {
      expect(sql).toMatch(/"id"\s+in\s+\(/i);
    }
  });

  it("binds every requested id as a parameter", async () => {
    const { params } = await capture({ ids: [11, 22, 33] });

    for (const values of params) {
      expect(values).toEqual(expect.arrayContaining([11, 22, 33]));
    }
  });

  // The dangerous regression: if the predicate is dropped, the endpoint quietly
  // returns every work unit in the region instead of the requested handful.
  it("adds NO id predicate when ids is absent", async () => {
    const { all } = await capture({});

    expect(all).not.toMatch(/"id"\s+in\s+\(/i);
  });

  it("still scopes by region when filtering by ids", async () => {
    const { statements, params } = await capture({ ids: [5] });

    for (const sql of statements) {
      expect(sql).toContain('"region"');
    }
    for (const values of params) {
      expect(values).toContain("ID");
    }
  });

  it("composes ids with workCenterId rather than replacing it", async () => {
    const { statements, params } = await capture({ ids: [5, 6], workCenterId: 7 });

    for (const sql of statements) {
      expect(sql).toMatch(/"id"\s+in\s+\(/i);
      expect(sql).toContain('"work_center_id"');
    }
    for (const values of params) {
      expect(values).toEqual(expect.arrayContaining([5, 6, 7]));
    }
  });

  it("composes ids with the q search", async () => {
    const { statements } = await capture({ ids: [5], q: "packer" });

    for (const sql of statements) {
      expect(sql).toMatch(/"id"\s+in\s+\(/i);
      expect(sql.toLowerCase()).toContain("ilike");
    }
  });

  it("handles a single id", async () => {
    const { statements, params } = await capture({ ids: [42] });

    for (const sql of statements) {
      expect(sql).toMatch(/"id"\s+in\s+\(/i);
    }
    for (const values of params) {
      expect(values).toContain(42);
    }
  });
});
