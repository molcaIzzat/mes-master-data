import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { TimezoneReaderRepository } from "./timezone-repository.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";

// The whole point of the nested `with` is that a four-level walk costs ONE round
// trip. A recording client is the only way to assert that: it captures every
// compiled statement, so a rewrite that turns the lateral join back into an N+1
// (or drops a region filter) fails here rather than in production.
async function capture(walk: (repo: TimezoneReaderRepository) => Promise<unknown>) {
  const statements: string[] = [];
  const params: unknown[][] = [];

  // node-postgres takes the bound values as the SECOND argument, not as a key on
  // the config object — reading `config.values` yields undefined and makes every
  // parameter assertion vacuously pass against an empty array.
  const client = {
    query: (config: { text: string }, values?: unknown[]) => {
      statements.push(config.text);
      params.push(values ?? []);
      return Promise.resolve({ rows: [], fields: [], rowCount: 0 });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;
  const repo = new TimezoneReaderRepository({ db, region: "ID" });

  await walk(repo);

  return { statements, params, sql: statements.join("\n---\n"), values: params.flat() };
}

describe("TimezoneReaderRepository.findWorkUnitChain", () => {
  it("resolves the whole chain in a single statement", async () => {
    const { statements } = await capture((repo) => repo.findWorkUnitChain(42));

    expect(statements).toHaveLength(1);
  });

  it("reaches all the way to sites", async () => {
    const { sql } = await capture((repo) => repo.findWorkUnitChain(42));

    for (const table of ["work_units", "work_centers", "areas", "sites"]) {
      expect(sql).toContain(table);
    }
    expect(sql).toContain("timezone");
  });

  it("binds the work unit id", async () => {
    const { values } = await capture((repo) => repo.findWorkUnitChain(42));

    expect(values).toContain(42);
  });

  // The dangerous regression: a relational `with` joins on the foreign key alone,
  // so dropping a nested region filter would let a work unit resolve to another
  // tenant's site — and the response would look entirely plausible.
  it("filters by region at every level of the walk", async () => {
    const { values } = await capture((repo) => repo.findWorkUnitChain(42));

    // work unit + work center + area + site.
    expect(values.filter((v) => v === "ID")).toHaveLength(4);
  });
});

describe("TimezoneReaderRepository.findWorkCenterChain", () => {
  it("resolves the whole chain in a single statement", async () => {
    const { statements } = await capture((repo) => repo.findWorkCenterChain(7));

    expect(statements).toHaveLength(1);
  });

  it("reaches sites without going through work units", async () => {
    const { sql } = await capture((repo) => repo.findWorkCenterChain(7));

    for (const table of ["work_centers", "areas", "sites"]) {
      expect(sql).toContain(table);
    }
    expect(sql).not.toContain("work_units");
  });

  it("filters by region at every level of the walk", async () => {
    const { values } = await capture((repo) => repo.findWorkCenterChain(7));

    // One level shorter than the work-unit walk: work center + area + site.
    expect(values.filter((v) => v === "ID")).toHaveLength(3);
  });
});
