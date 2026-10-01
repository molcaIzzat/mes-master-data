import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import { createDowntimeActionSchema } from "./downtime-action-dto.js";

// mes-oee-monitor creates actions through this schema, from the downtime edit
// dialog: the operator types a name, presses Enter, and the code is slugified
// from it. That path is why the floors below are what they are.
describe("createDowntimeActionSchema", () => {
  const valid = { code: "replace_belt", name: "Replace Belt", color: "#f43f5e" };

  it("accepts a slugified code with the default rose colour", () => {
    expect(z.parse(createDowntimeActionSchema, valid)).toEqual(valid);
  });

  // The floor was 5 and is now 3, matching downtime-reason. Real action names are
  // short — "Oil", "Reset" — and a 5-character floor rejected them with a 400 the
  // operator could neither see the reason for nor act on.
  it("accepts a three-character name and code", () => {
    expect(() =>
      z.parse(createDowntimeActionSchema, { code: "oil", name: "Oil", color: "#f43f5e" }),
    ).not.toThrow();
  });

  it("still rejects anything shorter", () => {
    expect(() => z.parse(createDowntimeActionSchema, { ...valid, code: "ab" })).toThrow();
    expect(() => z.parse(createDowntimeActionSchema, { ...valid, name: "Ab" })).toThrow();
  });

  // `color` is a varchar(10). Without the pattern, a longer value is TRUNCATED by
  // Postgres rather than rejected — and a truncated hex is a different colour,
  // with nothing anywhere to say so. These are the cases that used to pass.
  it("rejects a colour that is not #rrggbb", () => {
    for (const color of ["red rose", "#f43f5", "f43f5e", "#f43f5e99", "rgb(244,63,94)"]) {
      expect(() => z.parse(createDowntimeActionSchema, { ...valid, color })).toThrow();
    }
  });

  it("accepts either hex case", () => {
    expect(() => z.parse(createDowntimeActionSchema, { ...valid, color: "#F43F5E" })).not.toThrow();
  });
});
