import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listSiteInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
});

// Kept apart from the create schema so the update schema can be built without
// its default -- see `updateSiteSchema`.
const siteFields = {
  code: z.string().check(z.minLength(5)),
  name: z.string().check(z.minLength(5)),
  enterpriseId: z.nullable(z.number().check(z.positive(), z.int())),
  timezone: z.string(),
};

const createSiteSchema = z.object({
  ...siteFields,
  // On create, leaving the enterprise out means "none".
  enterpriseId: z._default(siteFields.enterpriseId, null),
});

// Deliberately NOT `createSiteSchema.partial()`: `.partial()` leaves the
// `_default` wrapper in place and zod still fills it in for a key the body never
// sent, so a PUT carrying only `timezone` would detach the site from its
// enterprise. The repository writes whatever survives parsing, so anything that
// leaks in here is a column overwritten with a default.
const updateSiteSchema = z.object(siteFields).partial();

const siteValidator = {
  paginate: queryValidator(listSiteInputSchema),
  create: jsonValidator(createSiteSchema),
  update: jsonValidator(updateSiteSchema),
};

export { siteValidator, updateSiteSchema };
