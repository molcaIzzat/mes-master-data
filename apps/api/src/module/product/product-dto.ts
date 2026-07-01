import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

import { PRODUCT_CYCLE_TIME_UNIT, PRODUCT_PACKAGING_TYPE } from "./product.js";

const listProductInputSchema = paginationSchema.extend({
  q: z.optional(z.string().transform((v) => (v === "" ? undefined : v))),
  areaId: z.optional(z.coerce.number().transform((v) => (v === 0 ? undefined : v))),
});

const productPackageSchema = z.object({
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
});

const productConvertionSchema = z.object({
  value: z.number().check(z.positive()),
  unit: z.string(),
  sortOrder: z.number().check(z.positive()),
});

const productLineSchema = z.number();

const productSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  areaId: z.number(),
  cycleTime: z.number().check(z.positive()),
  cycleTimeUnit: z.enum(PRODUCT_CYCLE_TIME_UNIT),
  price: z.number().check(z.positive()),
  cost: z.number().check(z.positive()),
});

const createProductSchema = productSchema.extend({
  lineIds: z.array(productLineSchema).check(z.minLength(1)),
  packages: z.array(productPackageSchema).check(z.minLength(1)),
  convertions: z.array(productConvertionSchema),
});

const updateProductSchema = productSchema.partial().extend({
  lineIds: z.optional(z.array(productLineSchema).check(z.minLength(1))),
  packages: z.optional(
    z
      .array(
        productPackageSchema.extend({
          id: z.number(),
        }),
      )
      .check(z.minLength(1)),
  ),
  convertions: z.optional(
    z.array(
      productConvertionSchema.extend({
        id: z.number(),
      }),
    ),
  ),
});

const productValidator = {
  paginate: queryValidator(listProductInputSchema),
  create: jsonValidator(createProductSchema),
  update: jsonValidator(updateProductSchema),
};

export { productValidator };
