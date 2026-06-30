import * as z from "zod";
import { jsonValidator } from "@molca/helper";

import { PRODUCT_PACKAGING_TYPE } from "../product/product.js";

const updateProductPackageSchema = z
  .object({
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
  })
  .partial();

const productPackageValidator = {
  update: jsonValidator(updateProductPackageSchema),
};

export { productPackageValidator };
