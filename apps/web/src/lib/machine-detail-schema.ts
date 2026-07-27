import * as z from "zod";

import { COUNT_ROLES, COUNT_SOURCES } from "./types.js";

import type {
  CountPointListItem,
  CountRole,
  CountSource,
  CreateCountPointInput,
  CreateProductAliasInput,
  CreateProductSpecInput,
  ProductAliasListItem,
  ProductSpecListItem,
} from "./types.js";

// Selects hold `number | null`; the refinement rejects the empty state so
// "required" is enforced on submit.
function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((v): v is number => v != null && v > 0, message);
}

// Enum selects start empty, so they are typed as plain strings and narrowed by
// the same kind of refinement.
function requiredEnum<T extends string>(values: readonly T[], message: string) {
  return z.string().refine((v): v is T => (values as readonly string[]).includes(v), message);
}

// The API takes `idealRatePerHour` as a positive integer; the input holds it as
// a string, so parse before checking.
const cycleTime = z.string().refine((v) => {
  const parsed = Number(v);
  return v.trim() !== "" && Number.isInteger(parsed) && parsed >= 1;
}, "Cycle Time must be a whole number of 1 or more");

// Constraints mirror createProductSpecSchema / createProductAliasSchema /
// createCountPointSchema in the API's work-unit-dto, so the user sees the error
// before the request goes out.
const specificationSchema = z.object({
  productId: requiredId("Product is required"),
  uomId: requiredId("Unit is required"),
  cycleTime,
});

const productCodeSchema = z.object({
  productId: requiredId("Product is required"),
  equipmentId: requiredId("Equipment is required"),
  externalCode: z.string().min(1, "External Code is required"),
});

const countPointSchema = z.object({
  equipmentId: requiredId("Equipment is required"),
  uomId: requiredId("Unit is required"),
  role: requiredEnum(COUNT_ROLES, "Role is required"),
  source: requiredEnum(COUNT_SOURCES, "Source is required"),
  sourceTag: z.string().min(3, "Source Tag must be at least 3 characters"),
});

type SpecificationFormValues = z.input<typeof specificationSchema>;
type ProductCodeFormValues = z.input<typeof productCodeSchema>;
type CountPointFormValues = z.input<typeof countPointSchema>;

function defaultSpecificationValues(): SpecificationFormValues {
  return { productId: null, uomId: null, cycleTime: "" };
}

function defaultProductCodeValues(): ProductCodeFormValues {
  return { productId: null, equipmentId: null, externalCode: "" };
}

function defaultCountPointValues(): CountPointFormValues {
  return { equipmentId: null, uomId: null, role: "", source: "plc", sourceTag: "" };
}

function toSpecificationFormValues(item: ProductSpecListItem): SpecificationFormValues {
  return {
    productId: item.product?.id ?? null,
    uomId: item.uom?.id ?? null,
    cycleTime: String(item.idealRatePerHour),
  };
}

function toProductCodeFormValues(item: ProductAliasListItem): ProductCodeFormValues {
  return {
    productId: item.product?.id ?? null,
    equipmentId: item.equipment?.id ?? null,
    externalCode: item.externalCode,
  };
}

function toCountPointFormValues(item: CountPointListItem): CountPointFormValues {
  return {
    equipmentId: item.equipment?.id ?? null,
    uomId: item.uom?.id ?? null,
    role: item.role,
    source: item.source,
    sourceTag: item.sourceTag,
  };
}

// The three mappers below run only after validation, so the required ids and
// enums are non-null by then.
function toSpecificationRequestBody(values: SpecificationFormValues): CreateProductSpecInput {
  return {
    productId: values.productId as number,
    uomId: values.uomId as number,
    idealRatePerHour: Number(values.cycleTime),
  };
}

function toProductCodeRequestBody(values: ProductCodeFormValues): CreateProductAliasInput {
  return {
    productId: values.productId as number,
    equipmentId: values.equipmentId as number,
    externalCode: values.externalCode.trim(),
  };
}

function toCountPointRequestBody(values: CountPointFormValues): CreateCountPointInput {
  return {
    equipmentId: values.equipmentId as number,
    uomId: values.uomId as number,
    role: values.role as CountRole,
    source: values.source as CountSource,
    sourceTag: values.sourceTag.trim(),
  };
}

// The API stores both enums snake_cased; these are what the table and the
// selects show instead.
const COUNT_ROLE_LABELS: Record<CountRole, string> = {
  infeed: "Infeed",
  good_output: "Good Output",
  reject: "Reject",
  good_weight: "Good Weight",
  reject_weight: "Reject Weight",
  total_weight: "Total Weight",
};

const COUNT_SOURCE_LABELS: Record<CountSource, string> = {
  plc: "PLC",
  manual: "Manual",
};

export {
  COUNT_ROLE_LABELS,
  COUNT_SOURCE_LABELS,
  countPointSchema,
  defaultCountPointValues,
  defaultProductCodeValues,
  defaultSpecificationValues,
  productCodeSchema,
  specificationSchema,
  toCountPointFormValues,
  toCountPointRequestBody,
  toProductCodeFormValues,
  toProductCodeRequestBody,
  toSpecificationFormValues,
  toSpecificationRequestBody,
};
export type { CountPointFormValues, ProductCodeFormValues, SpecificationFormValues };
