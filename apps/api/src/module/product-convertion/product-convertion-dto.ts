import * as z from "zod";
import { jsonValidator } from "@molca/helper";

const updateProductConvertionSchema = z
  .object({
    value: z.number().check(z.positive()),
    unit: z.string(),
    sortOrder: z.number().check(z.positive()),
  })
  .partial();

const productConvertionValidator = {
  update: jsonValidator(updateProductConvertionSchema),
};

export { productConvertionValidator };
