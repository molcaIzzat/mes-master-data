import * as z from "zod";

import { jsonValidator, paginationSchema, queryValidator } from "@molca/helper";

const listProductInputSchema = paginationSchema.extend({
  q: z.pipe(
    z.optional(z.string()),
    z.transform((v) => (v === "" ? undefined : v)),
  ),
  areaId: z.pipe(
    z.optional(z.coerce.number()),
    z.transform((v) => (v === 0 ? undefined : v)),
  ),
});

const productPackageSchema = z.object({
  main: z.boolean(),
  uomId: z.number().check(z.positive(), z.int()),
  sortOrder: z.number().check(z.positive(), z.int()),
  stdWeight: z.number().check(z.positive()),
  minWeight: z.number().check(z.positive()),
  maxWeight: z.number().check(z.positive()),
  length: z.number().check(z.positive()),
  width: z.number().check(z.positive()),
  height: z.number().check(z.positive()),
  vol: z.number().check(z.positive()),
});

const productConvertionSchema = z.object({
  factorToBase: z.number().check(z.positive()),
  uomId: z.number().check(z.positive(), z.int()),
  unit: z.string(),
  sortOrder: z.number().check(z.positive()),
});

const productLineSchema = z.number();

const productSchema = z.object({
  code: z.string().min(5),
  name: z.string().min(5),
  areaId: z.number().check(z.positive(), z.int()),
  baseUomId: z.number().check(z.positive(), z.int()),
  idealRatePerHour: z.nullable(
    z.pipe(
      z.number().check(z.positive()),
      z.transform((v) => (v === 0 ? null : String(v))),
    ),
  ),
  price: z.nullable(
    z.pipe(
      z.number().check(z.positive()),
      z.transform((v) => (v === 0 ? null : String(v))),
    ),
  ),
  cost: z.nullable(
    z.pipe(
      z.number().check(z.positive()),
      z.transform((v) => (v === 0 ? null : String(v))),
    ),
  ),
});

const createProductSchema = productSchema.extend({
  workCenterIds: z.array(productLineSchema).check(z.minLength(1)),
  packages: z.array(productPackageSchema).check(z.minLength(1)),
  convertions: z.array(productConvertionSchema),
});

const updateProductSchema = productSchema.partial().extend({
  workCenterIds: z.optional(z.array(productLineSchema).check(z.minLength(1))),
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
