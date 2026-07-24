import * as z from "zod";

import type {
  CreateDowntimeReasonInput,
  DowntimeReasonCategory,
  DowntimeReasonListItem,
} from "./types.js";

// Selects hold `number | null` (or the category enum | null); the refinements
// reject the empty (null) state so "required" is enforced on submit.
function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((v): v is number => v != null && v > 0, message);
}

const downtimeReasonSchema = z.object({
  areaId: requiredId("Area is required"),
  workCenterIds: z.array(z.number()).min(1, "Select at least one line"),
  equipmentIds: z.array(z.number()).min(1, "Select at least one machine"),
  category: z
    .enum(["PLANNED", "UNPLANNED", "SMALL_STOP"])
    .nullable()
    .refine((v): v is DowntimeReasonCategory => v != null, "Category is required"),
  name: z.string().min(3, "Downtime Reason must be at least 3 characters"),
  code: z.string().min(3, "Code must be at least 3 characters"),
});

type DowntimeReasonFormValues = z.input<typeof downtimeReasonSchema>;

function defaultDowntimeReasonValues(): DowntimeReasonFormValues {
  return {
    areaId: null,
    workCenterIds: [],
    equipmentIds: [],
    category: null,
    name: "",
    code: "",
  };
}

// Seeds the form from an existing list row for the edit modal. Area is single
// in the UI, so the first related area is used.
function toFormValues(item: DowntimeReasonListItem): DowntimeReasonFormValues {
  return {
    areaId: item.areas[0]?.id ?? null,
    workCenterIds: item.workCenters.map((wc) => wc.id),
    equipmentIds: item.equipments.map((e) => e.id),
    category: item.category,
    name: item.name,
    code: item.code,
  };
}

// Maps validated form state to the create/update request body. Called only
// after validation succeeds, so areaId/category are non-null.
function toRequestBody(values: DowntimeReasonFormValues): CreateDowntimeReasonInput {
  return {
    code: values.code,
    name: values.name,
    category: values.category as DowntimeReasonCategory,
    areaIds: values.areaId != null ? [values.areaId] : [],
    workCenterIds: values.workCenterIds,
    equipmentIds: values.equipmentIds,
  };
}

export { defaultDowntimeReasonValues, downtimeReasonSchema, toFormValues, toRequestBody };
export type { DowntimeReasonFormValues };
