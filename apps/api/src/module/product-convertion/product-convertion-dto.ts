import * as z from "zod";
import { jsonValidator } from "@molca/helper";

const updateProductConvertionSchema = z
  .object({
    factorToBase: z.number().check(z.positive()),
    uomId: z.number().check(z.positive(), z.int()),
    sortOrder: z.number().check(z.positive()),
  })
  .partial();

const productConvertionValidator = {
  update: jsonValidator(updateProductConvertionSchema),
};

export { productConvertionValidator };
