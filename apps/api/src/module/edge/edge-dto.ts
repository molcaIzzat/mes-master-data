import * as z from "zod";

import { jsonValidator } from "@molca/helper";

const createEdgeSchema = z
  .object({
    fromWorkUnitId: z.int().check(z.positive()),
    toWorkUnitId: z.int().check(z.positive()),
  })
  .check(
    z.refine((val) => val.fromWorkUnitId !== val.toWorkUnitId, {
      message: "Cannot connect unit to itself",
      path: ["toWorkUnitId"],
    }),
  );

// An edit moves the endpoints, so it takes the same body -- including the
// no-self-loop refinement -- as a create.
const edgeValidator = {
  create: jsonValidator(createEdgeSchema),
  update: jsonValidator(createEdgeSchema),
};

export { edgeValidator };
