import { describe, it, expect } from "vite-plus/test";
import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../../shared/database/relations/relations.js";
import { ProductReaderRepository } from "./product-repository.js";

import type { NodePgClient } from "drizzle-orm/node-postgres";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { ProductFilter } from "./product.js";

// Drives the repository against a client that records statements instead of
// running them, so the compiled SQL can be asserted without a live database.
function capture(filter: ProductFilter) {
  const statements: string[] = [];
  const client = {
    query: (config: { text: string }) => {
      statements.push(config.text);
      return Promise.resolve({ rows: [], fields: [], rowCount: 0 });
    },
  };

  const db = drizzle({ client: client as unknown as NodePgClient, relations }) as PostgresDB;
  const repo = new ProductReaderRepository({ db, region: "ID" });

  return repo.findAll({ limit: 10, offset: 0, filter }).then(() => {
    const [rows, count] = statements;
    return { statements, rows: rows ?? "", count: count ?? "" };
  });
}

// The page query always joins the junction table to project `workCenters`, so
// its presence proves nothing; only these predicates do.
const ROWS_PREDICATE = 'exists (select * from "ms_core"."products_work_centers"';
const COUNT_PREDICATE = 'in (select "product_id" from "ms_core"."products_work_centers"';

describe("ProductReaderRepository.findAll", () => {
  it("constrains the rows and the count alike when filtering by line", async () => {
    const { statements, rows, count } = await capture({ workCenterId: 7 });

    // One query for the page of products, one for the total.
    expect(statements).toHaveLength(2);
    expect(rows).toContain(ROWS_PREDICATE);
    expect(count).toContain(COUNT_PREDICATE);
  });

  it("leaves the junction predicate out when no line is given", async () => {
    const { rows, count } = await capture({});

    expect(rows).not.toContain(ROWS_PREDICATE);
    expect(count).not.toContain('"ms_core"."products_work_centers"');
  });

  it("keeps the area and search filters working alongside it", async () => {
    const { rows, count } = await capture({ workCenterId: 7, areaId: 3, q: "milk" });

    expect(rows).toContain('"area_id"');
    expect(rows).toContain(ROWS_PREDICATE);
    expect(count).toContain('"ms_core"."products"."area_id"');
    expect(count).toContain("ilike");
    expect(count).toContain(COUNT_PREDICATE);
  });
});
