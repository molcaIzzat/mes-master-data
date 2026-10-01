import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import { updateSiteSchema } from "./site-dto.js";

// `SiteWriterRepository.update` writes every key that survives parsing, so a key
// the client never sent must not appear in the parsed patch -- otherwise a PUT
// that carries one field blanks the columns it said nothing about. `.partial()`
// over a schema with `z._default(...)` fields does exactly that, which is why the
// update schema is built off the plain fields.
describe("updateSiteSchema", () => {
  it("keeps a timezone-only body to just the timezone", () => {
    const patch = z.parse(updateSiteSchema, { timezone: "Asia/Jakarta" });

    expect(Object.keys(patch)).toEqual(["timezone"]);
  });

  it("does not detach the site from its enterprise", () => {
    const patch = z.parse(updateSiteSchema, { name: "Plant Two" });

    expect("enterpriseId" in patch).toBe(false);
  });

  it("still accepts an explicit null when the client means to clear the enterprise", () => {
    expect(z.parse(updateSiteSchema, { enterpriseId: null })).toEqual({ enterpriseId: null });
  });

  it("still validates the fields it is given", () => {
    expect(() => z.parse(updateSiteSchema, { code: "abc" })).toThrow();
    expect(() => z.parse(updateSiteSchema, { enterpriseId: 0 })).toThrow();
  });
});
