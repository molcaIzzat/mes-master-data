import * as z from "zod";

import type { CreateEdgeInput, EdgeListItem } from "./types.js";

// Selects hold `number | null`; the refinement rejects the empty state so
// "required" is enforced on submit.
function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((v): v is number => v != null && v > 0, message);
}

// Mirrors createEdgeSchema in the API's edge-dto, including its no-self-loop
// check -- a machine cannot feed itself, and the database enforces it too.
const flowSchema = z
  .object({
    fromWorkUnitId: requiredId("From machine is required"),
    toWorkUnitId: requiredId("To machine is required"),
  })
  .refine((v) => v.fromWorkUnitId == null || v.fromWorkUnitId !== v.toWorkUnitId, {
    message: "A machine cannot flow into itself",
    path: ["toWorkUnitId"],
  });

type FlowFormValues = z.input<typeof flowSchema>;

function defaultFlowValues(): FlowFormValues {
  return { fromWorkUnitId: null, toWorkUnitId: null };
}

function toFlowFormValues(item: EdgeListItem): FlowFormValues {
  return {
    fromWorkUnitId: item.from?.id ?? null,
    toWorkUnitId: item.to?.id ?? null,
  };
}

// Runs only after validation, so both ids are non-null by then.
function toFlowRequestBody(values: FlowFormValues): CreateEdgeInput {
  return {
    fromWorkUnitId: values.fromWorkUnitId as number,
    toWorkUnitId: values.toWorkUnitId as number,
  };
}

export { defaultFlowValues, flowSchema, toFlowFormValues, toFlowRequestBody };
export type { FlowFormValues };
