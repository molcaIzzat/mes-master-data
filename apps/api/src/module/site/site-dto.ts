import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listSiteInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

const createSiteSchema = z.object({
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  enterpriseId: z._default(z.nullable(z.number().check(z.positive(), z.int())), null),
  timezone: z.string(),
});

const updateSiteSchema = createSiteSchema.partial();

const siteValidator = {
  paginate: queryValidator(listSiteInputSchema),
  create: jsonValidator(createSiteSchema),
  update: jsonValidator(updateSiteSchema),
};

export { siteValidator };
