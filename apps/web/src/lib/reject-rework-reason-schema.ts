import * as z from "zod";

import type { CreateRejectReworkReasonInput, RejectReworkReasonListItem } from "./types.js";

// Selects hold `number | null`; the refinement rejects the empty (null) state
// so "required" is enforced on submit.
function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((v): v is number => v != null && v > 0, message);
}

const rejectReworkReasonSchema = z.object({
  areaId: requiredId("Area is required"),
  workCenterIds: z.array(z.number()).min(1, "Select at least one line"),
  equipmentIds: z.array(z.number()).min(1, "Select at least one equipment"),
  name: z.string().min(5, "Reason must be at least 5 characters"),
  code: z.string().min(5, "Code must be at least 5 characters"),
});

type RejectReworkReasonFormValues = z.input<typeof rejectReworkReasonSchema>;

function defaultRejectReworkReasonValues(): RejectReworkReasonFormValues {
  return {
    areaId: null,
    workCenterIds: [],
    equipmentIds: [],
    name: "",
    code: "",
  };
}

// Seeds the form from an existing list row for the edit modal. Area is single
// in the UI, so the first related area is used.
function toFormValues(item: RejectReworkReasonListItem): RejectReworkReasonFormValues {
  return {
    areaId: item.areas[0]?.id ?? null,
    workCenterIds: item.workCenters.map((wc) => wc.id),
    equipmentIds: item.equipments.map((e) => e.id),
    name: item.name,
    code: item.code,
  };
}

// Maps validated form state to the create/update request body. Called only
// after validation succeeds, so areaId is non-null.
function toRequestBody(values: RejectReworkReasonFormValues): CreateRejectReworkReasonInput {
  return {
    code: values.code,
    name: values.name,
    areaIds: values.areaId != null ? [values.areaId] : [],
    workCenterIds: values.workCenterIds,
    equipmentIds: values.equipmentIds,
  };
}

export { defaultRejectReworkReasonValues, rejectReworkReasonSchema, toFormValues, toRequestBody };
export type { RejectReworkReasonFormValues };
