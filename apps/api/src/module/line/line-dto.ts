import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { LINE_CATEGORY } from "./line.js";

const listLineInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number()),
  category: z.optional(z.enum(LINE_CATEGORY)),
});

const createLineSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  areaId: z.number(),
  category: z.enum(LINE_CATEGORY),
});

const updateLineSchema = createLineSchema.partial();

const lineValidator = {
  paginate: queryValidator(listLineInputSchema),
  create: jsonValidator(createLineSchema),
  update: jsonValidator(updateLineSchema),
};

export { lineValidator };
