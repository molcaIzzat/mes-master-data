import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listDowntimeActionInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
});

// `min(3)`, matching downtime-reason rather than the 5 this used to require.
// mes-oee-monitor creates an action from the downtime edit dialog by slugifying
// whatever the operator typed, and real action names are short — "Oil", "Reset".
// A 5-character floor rejected those with a 400 the operator could not act on.
//
// `color` is a hex string and the column is varchar(10), so the pattern is
// enforced here rather than left to Postgres truncating silently.
const createDowntimeActionSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(3),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color must be a #rrggbb hex string"),
});

const updateDowntimeActionSchema = createDowntimeActionSchema.partial();

const downtimeActionValidator = {
  paginate: queryValidator(listDowntimeActionInputSchema),
  create: jsonValidator(createDowntimeActionSchema),
  update: jsonValidator(updateDowntimeActionSchema),
};

export { downtimeActionValidator, createDowntimeActionSchema };
