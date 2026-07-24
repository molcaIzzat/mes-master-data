import * as z from "zod";

// The schema validates form state directly, so its INPUT type must match the
// form-state shape react-form holds: numeric text inputs stay strings, selects
// hold `number | null`. `z.input` is re-exported as the form value types so the
// two never drift. `id` is a client-only key for list rendering + dnd.
function positiveString(message: string) {
  return z.string().refine((v) => Number(v) > 0, message);
}

function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((v): v is number => v != null && v > 0, message);
}

const packageSchema = z.object({
  id: z.string(),
  // Existing DB package id (0 for rows added in the form). Sent back on update
  // so the API can diff packages by id; ignored on create.
  dbId: z.number(),
  uomId: requiredId("Select a unit"),
  main: z.boolean(),
  stdWeight: positiveString("Must be greater than 0"),
  minWeight: positiveString("Must be greater than 0"),
  maxWeight: positiveString("Must be greater than 0"),
  // Conditionally required (non-main only) — enforced in superRefine below.
  factorToBase: z.string(),
});

const skuSchema = z
  .object({
    name: z.string().min(3, "SKU Name must be at least 3 characters"),
    code: z.string().min(3, "SKU Code must be at least 3 characters"),
    areaId: requiredId("Area is required"),
    workCenterIds: z.array(z.number()).min(1, "Select at least one line"),
    baseUomId: requiredId("Unit is required"),
    cycleTime: positiveString("Cycle time must be greater than 0"),
    price: positiveString("Price must be greater than 0"),
    cost: positiveString("Cost must be greater than 0"),
    packages: z.array(packageSchema).min(1, "Add at least one package"),
  })
  .superRefine((value, ctx) => {
    const mainCount = value.packages.filter((p) => p.main).length;
    if (mainCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one package must be the main unit",
        path: ["packages"],
      });
    }
    value.packages.forEach((pkg, index) => {
      if (!pkg.main && !(Number(pkg.factorToBase) > 0)) {
        ctx.addIssue({
          code: "custom",
          message: "Conversion value must be greater than 0",
          path: ["packages", index, "factorToBase"],
        });
      }
    });
  });

type PackageFormValue = z.input<typeof packageSchema>;
type SkuFormValues = z.input<typeof skuSchema>;

function makePackage(id: string, main = false): PackageFormValue {
  return {
    id,
    dbId: 0,
    uomId: null,
    main,
    stdWeight: "",
    minWeight: "",
    maxWeight: "",
    factorToBase: "",
  };
}

function defaultSkuValues(): SkuFormValues {
  return {
    name: "",
    code: "",
    areaId: null,
    workCenterIds: [],
    baseUomId: null,
    cycleTime: "",
    price: "",
    cost: "",
    packages: [makePackage("pkg-1", true)],
  };
}

export { defaultSkuValues, makePackage, skuSchema };
export type { PackageFormValue, SkuFormValues };
