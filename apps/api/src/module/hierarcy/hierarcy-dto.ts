import * as z from "zod";

import { paginationSchema, queryValidator } from "@molca/helper";

const listLineHierarcyInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number()),
});

const hierarcyValidator = {
  paginateLineHierarcy: queryValidator(listLineHierarcyInputSchema),
};

export { hierarcyValidator };
