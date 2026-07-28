import * as z from "zod";

import type {
  CreateEquipmentInput,
  CreateWorkCenterInput,
  CreateWorkUnitInput,
  LevelConfigurationListItem,
  LevelEquipmentItem,
  LevelWorkUnitItem,
  NodeLayout,
} from "./types.js";

// Fields the API requires but the level configuration UI deliberately does not
// ask for. `production_line` and `discrete` must stay paired: a DB check
// constraint on work_centers rejects any other combination.
const LINE_DEFAULTS = {
  type: "production_line",
  oeeMode: "discrete",
  idealRatePerHour: 14400,
} as const;

const MACHINE_DEFAULTS = {
  type: "work_cell",
  isOeeRelevant: true,
  isAcquirable: true,
  telemetryTags: null,
  position: { x: 0, y: 0 },
} as const;

// Selects hold `number | null`; the refinement rejects the empty state so
// "required" is enforced on submit.
function requiredId(message: string) {
  return z
    .number()
    .nullable()
    .refine((v): v is number => v != null && v > 0, message);
}

// The class/category selects are optional, so null stays a valid value.
const optionalId = z.number().nullable();

// The API enforces min 5 on work center and work unit code/name, and min 3 on
// equipment code/name and the signal tag. Mirrored here so the user sees the
// error before the request goes out.
const lineSchema = z.object({
  areaId: requiredId("Area is required"),
  name: z.string().min(5, "Line Name must be at least 5 characters"),
  code: z.string().min(5, "Line Code must be at least 5 characters"),
  workCenterClassId: optionalId,
});

const machineSchema = z.object({
  name: z.string().min(5, "Machine Name must be at least 5 characters"),
  code: z.string().min(5, "Machine Code must be at least 5 characters"),
  workUnitClassId: optionalId,
});

const equipmentSchema = z.object({
  name: z.string().min(3, "Equipment Name must be at least 3 characters"),
  code: z.string().min(3, "Equipment Code must be at least 3 characters"),
  equipmentClassId: optionalId,
  productSignalTag: z.string().min(3, "Product Signal Tag must be at least 3 characters"),
});

type LineFormValues = z.input<typeof lineSchema>;
type MachineFormValues = z.input<typeof machineSchema>;
type EquipmentFormValues = z.input<typeof equipmentSchema>;

function defaultLineValues(): LineFormValues {
  return { areaId: null, name: "", code: "", workCenterClassId: null };
}

function defaultMachineValues(): MachineFormValues {
  return { name: "", code: "", workUnitClassId: null };
}

function defaultEquipmentValues(): EquipmentFormValues {
  return { name: "", code: "", equipmentClassId: null, productSignalTag: "" };
}

function toLineFormValues(line: LevelConfigurationListItem): LineFormValues {
  return {
    areaId: line.area?.id ?? null,
    name: line.name,
    code: line.code,
    workCenterClassId: line.class?.id ?? null,
  };
}

function toMachineFormValues(unit: LevelWorkUnitItem): MachineFormValues {
  return {
    name: unit.name,
    code: unit.code,
    workUnitClassId: unit.class?.id ?? null,
  };
}

function toEquipmentFormValues(equipment: LevelEquipmentItem): EquipmentFormValues {
  return {
    name: equipment.name,
    code: equipment.code,
    equipmentClassId: equipment.class?.id ?? null,
    productSignalTag: equipment.productSignalTag,
  };
}

// The three mappers below run only after validation, so the required ids are
// non-null by then.
function toLineRequestBody(values: LineFormValues): CreateWorkCenterInput {
  return {
    code: values.code,
    name: values.name,
    areaId: values.areaId as number,
    workCenterClassId: values.workCenterClassId,
    ...LINE_DEFAULTS,
  };
}

// `position` is only passed by the DAG editor, which drops a new machine where
// the user is looking. Everywhere else the default origin stands, and an edit
// leaves the stored position alone because the API takes a partial body.
function toMachineRequestBody(
  values: MachineFormValues,
  workCenterId: number,
  position?: NodeLayout,
): CreateWorkUnitInput {
  return {
    code: values.code,
    name: values.name,
    workCenterId,
    workUnitClassId: values.workUnitClassId,
    ...MACHINE_DEFAULTS,
    position: position ?? MACHINE_DEFAULTS.position,
  };
}

function toEquipmentRequestBody(
  values: EquipmentFormValues,
  workUnitId: number,
): CreateEquipmentInput {
  return {
    code: values.code,
    name: values.name,
    workUnitId,
    equipmentClassId: values.equipmentClassId,
    productSignalTag: values.productSignalTag,
  };
}

export {
  LINE_DEFAULTS,
  MACHINE_DEFAULTS,
  defaultEquipmentValues,
  defaultLineValues,
  defaultMachineValues,
  equipmentSchema,
  lineSchema,
  machineSchema,
  toEquipmentFormValues,
  toEquipmentRequestBody,
  toLineFormValues,
  toLineRequestBody,
  toMachineFormValues,
  toMachineRequestBody,
};
export type { EquipmentFormValues, LineFormValues, MachineFormValues };
