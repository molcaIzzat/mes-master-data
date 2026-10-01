import * as z from "zod";

import type { CreateDowntimeActionInput, DowntimeActionListItem } from "./types.js";

// The colour the OEE monitor tints an action chip with. Stored as `#rrggbb` in a
// varchar(10) column, so the pattern is enforced on both sides — anything longer
// would be TRUNCATED by Postgres rather than rejected, which is how a colour
// silently becomes a different colour.
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Tailwind rose-500. The default for an action created on the fly from the OEE
// monitor's downtime edit dialog, and the default here so the two agree — an
// action's colour should not depend on which app created it.
const DEFAULT_ACTION_COLOR = "#f43f5e";

// A curated set rather than a free `<input type="color">`. These chips sit beside
// each other in the OEE monitor's downtime table, so an arbitrary picker produces
// twelve indistinguishable blues; a fixed palette keeps them tellable apart.
const ACTION_COLORS = [
  { value: "#f43f5e", label: "Rose" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Amber" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#64748b", label: "Slate" },
] as const;

// `min(3)` mirrors the API's `createDowntimeActionSchema`. Kept in step
// deliberately: a floor that is stricter here rejects a name the API would have
// taken, and a looser one turns a form error into a 400 the user cannot read.
const downtimeActionSchema = z.object({
  name: z.string().min(3, "Action must be at least 3 characters"),
  code: z.string().min(3, "Code must be at least 3 characters"),
  color: z.string().regex(HEX_COLOR, "Pick a colour"),
});

type DowntimeActionFormValues = z.input<typeof downtimeActionSchema>;

function defaultDowntimeActionValues(): DowntimeActionFormValues {
  return { name: "", code: "", color: DEFAULT_ACTION_COLOR };
}

// Seeds the form from an existing list row for the edit modal.
function toFormValues(item: DowntimeActionListItem): DowntimeActionFormValues {
  return { name: item.name, code: item.code, color: item.color };
}

// Maps validated form state to the create/update request body.
function toRequestBody(values: DowntimeActionFormValues): CreateDowntimeActionInput {
  return { code: values.code, name: values.name, color: values.color };
}

// Derives a code from a typed name: lowercase, non-alphanumerics collapsed to a
// single underscore, ends trimmed.
//
// SHARED SHAPE WITH THE OEE MONITOR, which slugifies the same way when an
// operator creates an action by pressing Enter in the downtime edit dialog. The
// two implementations are separate because there is no schema package between the
// repos — if this changes, change apps/web/src/lib/slug.ts there too, or the same
// action name will produce two different codes and the second create will 409 on
// the unique (code, region) constraint.
function slugifyActionCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export {
  ACTION_COLORS,
  DEFAULT_ACTION_COLOR,
  defaultDowntimeActionValues,
  downtimeActionSchema,
  slugifyActionCode,
  toFormValues,
  toRequestBody,
};
export type { DowntimeActionFormValues };
