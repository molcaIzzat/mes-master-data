import { describe, it, expect } from "vite-plus/test";
import * as z from "zod";

import {
  ACTION_COLORS,
  DEFAULT_ACTION_COLOR,
  downtimeActionSchema,
  slugifyActionCode,
} from "./downtime-action-schema.js";

// The code an operator never types.
//
// THE STAKE IS A CROSS-REPO ONE. mes-oee-monitor slugifies the same way when it
// creates an action from its downtime edit dialog (`apps/web/src/lib/slug.ts`
// there). If the two disagree, the same action name produces two different codes
// and whichever app goes second gets a 409 on the unique (code, region) key —
// with a "duplicate" message over a name the operator can plainly see is not in
// the list. These cases are the contract between the two implementations.
describe("slugifyActionCode", () => {
  it("lowercases and joins words with a single underscore", () => {
    expect(slugifyActionCode("Replace Belt")).toBe("replace_belt");
  });

  it("collapses a run of separators rather than repeating underscores", () => {
    expect(slugifyActionCode("Belt  /  Chain")).toBe("belt_chain");
  });

  it("trims leading and trailing separators", () => {
    expect(slugifyActionCode("  (Reset)  ")).toBe("reset");
  });

  it("keeps digits, which appear in real action names", () => {
    expect(slugifyActionCode("Reset PLC 3")).toBe("reset_plc_3");
  });

  // Non-Latin input slugs to nothing, which the form's `min(3)` then rejects with
  // a message on the Code field. That is the correct outcome and not a crash —
  // pinned so nobody "fixes" it into a generated placeholder code.
  it("yields an empty string when there is nothing to slug", () => {
    expect(slugifyActionCode("!!!")).toBe("");
    expect(slugifyActionCode("   ")).toBe("");
  });
});

describe("downtimeActionSchema", () => {
  const valid = { name: "Replace Belt", code: "replace_belt", color: DEFAULT_ACTION_COLOR };

  it("accepts a form filled from a slugified name", () => {
    expect(() => z.parse(downtimeActionSchema, valid)).not.toThrow();
  });

  // Mirrors the API's `createDowntimeActionSchema`. A floor that drifts stricter
  // here rejects a name the API would take; looser, and a form error becomes a
  // 400 nobody renders.
  it("enforces the same three-character floor as the API", () => {
    expect(() => z.parse(downtimeActionSchema, { ...valid, name: "Ab" })).toThrow();
    expect(() => z.parse(downtimeActionSchema, { ...valid, code: "ab" })).toThrow();
    expect(() =>
      z.parse(downtimeActionSchema, { name: "Oil", code: "oil", color: DEFAULT_ACTION_COLOR }),
    ).not.toThrow();
  });

  it("rejects a colour that is not #rrggbb", () => {
    expect(() => z.parse(downtimeActionSchema, { ...valid, color: "red rose" })).toThrow();
  });
});

// The palette is what the picker offers, so every entry has to be a value the
// schema — and therefore the API, and therefore the varchar(10) column — accepts.
// A swatch nobody can save is worse than a missing one.
describe("ACTION_COLORS", () => {
  it("offers only colours the schema accepts", () => {
    for (const color of ACTION_COLORS) {
      expect(() =>
        z.parse(downtimeActionSchema, { name: "Replace Belt", code: "rb_1", color: color.value }),
      ).not.toThrow();
    }
  });

  // The default is the colour mes-oee-monitor stamps on an action created from
  // its dialog. If it were not in the palette, editing such an action here would
  // silently show no swatch selected and the first click would change it.
  it("includes the default rose that the OEE monitor creates actions with", () => {
    expect(ACTION_COLORS.some((color) => color.value === DEFAULT_ACTION_COLOR)).toBe(true);
  });
});
