import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listAreaInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  siteId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
});

const createAreaSchema = z.object({
  code: z.string().check(z.minLength(2)),
  name: z.string().check(z.minLength(2)),
  siteId: z.number().check(z.positive(), z.int()),
});

const updateAreaSchema = createAreaSchema.partial();

const areaValidator = {
  paginate: queryValidator(listAreaInputSchema),
  create: jsonValidator(createAreaSchema),
  update: jsonValidator(updateAreaSchema),
};

export { areaValidator };
