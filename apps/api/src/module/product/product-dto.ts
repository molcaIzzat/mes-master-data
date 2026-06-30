import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";
import { PRODUCT_CYCLE_TIME_UNIT, PRODUCT_PACKAGING_TYPE } from "./product.js";

const listProductInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number()),
});

const createProductSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  areaId: z.number(),
  lineIds: z.array(z.number()).check(z.minLength(1)),
  cycleTime: z.number().check(z.positive()),
  cycleTimeUnit: z.enum(PRODUCT_CYCLE_TIME_UNIT),
  price: z.number().check(z.positive()),
  cost: z.number().check(z.positive()),
  packages: z
    .array(
      z.object({
        main: z.boolean(),
        sortOrder: z.number().check(z.positive()),
        package: z.enum(PRODUCT_PACKAGING_TYPE),
        stdWeight: z.number().check(z.positive()),
        minWeight: z.number().check(z.positive()),
        maxWeight: z.number().check(z.positive()),
        length: z.number().check(z.positive()),
        width: z.number().check(z.positive()),
        height: z.number().check(z.positive()),
        vol: z.number().check(z.positive()),
      }),
    )
    .check(z.minLength(1)),
  convertions: z.array(
    z.object({
      value: z.number().check(z.positive()),
      unit: z.string(),
      sortOrder: z.number().check(z.positive()),
    }),
  ),
});

const updateProductSchema = createProductSchema.partial();

const productValidator = {
  paginate: queryValidator(listProductInputSchema),
  create: jsonValidator(createProductSchema),
  update: jsonValidator(updateProductSchema),
};

export { productValidator };
