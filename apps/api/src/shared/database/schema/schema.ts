import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";

const defaultColumns = () => ({
  id: p.serial("id").primaryKey(),
  region: p.varchar({ length: 10 }).notNull(),
  createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  code: p.varchar({ length: 100 }).notNull(),
  name: p.varchar({ length: 100 }).notNull(),
});

const defaultIndexes = (
  t: {
    code: p.PgColumn;
    region: p.PgColumn;
    updatedAt: p.PgColumn;
  },
  tableName: string,
) => [
  p.unique(`${tableName}_code_region_key`).on(t.code, t.region),
  p.index(`${tableName}_region_updated_idx`).on(t.region, t.updatedAt),
];

export const msCore = p.pgSchema("ms_core");
export const msDowntime = p.pgSchema("ms_downtime");
export const msReject = p.pgSchema("ms_reject");

export const workCenterType = msCore.enum("work_center_type", [
  "production_line", // discrete
  "process_cell", // batch      ← your Area B
  "production_unit", // continuous ← your Area A
  "storage_zone",
]);

export const workUnitType = msCore.enum("work_unit_type", [
  "work_cell", // under production_line
  "unit", // under process_cell / production_unit
  "storage_unit", // under storage_zone
]);

export const oeeMode = msCore.enum("oee_mode", ["continuous", "batch", "discrete", "none"]);

export const countRole = msCore.enum("count_role", ["infeed", "good_output", "reject"]);

export const siteTable = msCore.table(
  "sites",
  {
    ...defaultColumns(),
    timezone: p.varchar().notNull(),
  },
  (t) => [...defaultIndexes(t, "sites")],
);

export const areaTable = msCore.table(
  "areas",
  {
    ...defaultColumns(),
    siteId: p
      .integer("site_id")
      .notNull()
      .references(() => siteTable.id, { onDelete: "restrict" }),
  },
  (t) => [...defaultIndexes(t, "areas"), p.index("areas_site_id_idx").on(t.siteId)],
);

export const workCenterTable = msCore.table(
  "work_centers",
  {
    ...defaultColumns(),
    areaId: p
      .integer("area_id")
      .notNull()
      .references(() => areaTable.id, { onDelete: "restrict" }),
    type: workCenterType("type").notNull(),
    oeeMode: oeeMode("oee_mode").notNull(),
    idealRateHour: p.numeric("ideal_rate_hour"),
  },
  (t) => [
    ...defaultIndexes(t, "wc"),
    p.index("wc_area_id_idx").on(t.areaId),
    p.check(
      "wc_mode_matches_type_ckx",
      sql`
      (type = 'production_unit'  AND oee_mode = 'continuous') OR
      (type = 'process_cell'     AND oee_mode = 'batch')      OR
      (type = 'production_line'  AND oee_mode = 'discrete')   OR
      (type = 'storage_zone'     AND oee_mode = 'none')
    `,
    ),
  ],
);

export const workUnitClassTable = msCore.table(
  "work_unit_classes",
  {
    ...defaultColumns(),
  },
  (t) => [...defaultIndexes(t, "wuc")],
);

export const workUnitTable = msCore.table(
  "work_units",
  {
    ...defaultColumns(),
    workCenterId: p
      .integer("work_center_id")
      .notNull()
      .references(() => workCenterTable.id),
    workUnitClassId: p.integer().references(() => workUnitClassTable.id, { onDelete: "restrict" }),
    type: workUnitType("type"),
  },
  (t) => [...defaultIndexes(t, "wu"), p.index("wu_wc_id_idx").on(t.workCenterId)],
);

export const equipmentClassTable = msCore.table(
  "equipment_classes",
  {
    ...defaultColumns(),
  },
  (t) => [...defaultIndexes(t, "ec")],
);

export const equipmentTable = msCore.table(
  "equipments",
  {
    ...defaultColumns(),
    workUnitId: p
      .integer("work_unit_id")
      .notNull()
      .references(() => workUnitTable.id, { onDelete: "cascade" }),
    parentEquipmentId: p
      .integer("parent_equipment_id")
      .references((): p.AnyPgColumn => equipmentTable.id),
    equipmentClassId: p.integer().references(() => equipmentClassTable.id),
    isOeeRelevant: p.boolean("is_oee_relevant").notNull().default(true),
    telemetryTags: p.jsonb("telemetry_tags").$type<Record<string, string>>(),
  },
  (t) => [
    ...defaultIndexes(t, "equipments"),
    p.index("equipments_wu_id_idx").on(t.workUnitId),
    p.index("equipments_parent_id_idx").on(t.parentEquipmentId),
    p.check("equipments_not_own_parent_ckx", sql`parent_equipment_id IS DISTINCT FROM id`),
  ],
);

export const oeeCountPointTable = msCore.table(
  "oee_count_points",
  {
    id: p.serial("id").primaryKey(),
    equipmentId: p
      .integer("equipment_id")
      .notNull()
      .references(() => equipmentTable.id),
    role: countRole("role").notNull(),
    uom: p.varchar("uom", { length: 100 }).notNull(), // 'shot' | 'bag' | 'carton' — converted via products.*
    sourceTag: p.varchar("source_tag", { length: 255 }).notNull(), // OPC-UA node id / Telegraf tag
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("uq_ocp_eq_role_tag").on(t.equipmentId, t.role, t.sourceTag),
    p.index("ix_ocp_eq").on(t.equipmentId),
  ],
);

export const productCycleTimeUnit = msCore.enum("product_cycle_time_unit", [
  "BAG_PER_MINUTE",
  "SHOT_PER_MINUTE",
  "SAK_PER_MINUTE",
  "PCS_PER_MINUTE",
]);

export const productPackagingType = msCore.enum("product_packaing_type", [
  "BAG",
  "SHOT",
  "CALENDER",
  "INNER",
  "CARTON",
  "SAK",
]);

// export const productTable = msCore.table(
//   "products",
//   {
//     ...defaultColumnsWithCode(),
//     cycleTime: p.numeric("cycle_time", { precision: 15, scale: 3, mode: "number" }).notNull(),
//     cycleTimeUnit: ProductCycleTimeUnitEnum("cycle_time_unit").notNull(),
//     areaId: p
//       .integer("area_id")
//       .references(() => areaTable.id, { onDelete: "restrict" })
//       .notNull(),
//     price: p.numeric({ precision: 15, scale: 3, mode: "number" }),
//     cost: p.numeric({ precision: 15, scale: 3, mode: "number" }),
//   },
//   (t) => [...defaultIndexesWithCode(t, "products"), p.index("products_area_id_idx").on(t.areaId)],
// );
//
// export const productConvertionTable = msCore.table(
//   "product_convertions",
//   {
//     id: p.serial("id").primaryKey(),
//     sortOrder: p.integer("sort_order").notNull(),
//     productId: p
//       .integer("product_id")
//       .references(() => productTable.id, { onDelete: "cascade" })
//       .notNull(),
//     unit: p.varchar({ length: 100 }).notNull(),
//     value: p.numeric({ precision: 15, scale: 3 }).notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [p.index("product_conversions_region_updated_idx").on(t.region, t.updatedAt)],
// );
//
// export const productCycleTimeMachineTable = msCore.table(
//   "product_cycle_time_machines",
//   {
//     id: p.serial("id").primaryKey(),
//     productId: p
//       .integer("product_id")
//       .references(() => productTable.id, { onDelete: "restrict" })
//       .notNull(),
//     machineId: p
//       .integer("machine_id")
//       .references(() => machineTable.id, { onDelete: "cascade" })
//       .notNull(),
//     productCode: p.varchar("product_code", { length: 100 }).notNull(),
//     machineCode: p.varchar("machine_code", { length: 100 }).notNull(),
//     cycleTime: p.numeric("cycle_time", { precision: 15, scale: 3, mode: "number" }).notNull(),
//     cycleTimeUnit: ProductCycleTimeUnitEnum("cycle_time_unit").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("product_cycle_time_machines_key").on(t.productId, t.machineId),
//     p.index("product_cycle_time_machines_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("products_cycle_time_machines_machine_id_idx").on(t.machineId),
//   ],
// );
//
// export const productPackagingTable = msCore.table(
//   "product_packages",
//   {
//     id: p.serial("id").primaryKey(),
//     productId: p
//       .integer("product_id")
//       .references(() => productTable.id, { onDelete: "cascade" })
//       .notNull(),
//     sortOrder: p.integer("sort_order").notNull(),
//     package: ProductPackagingTypeEnum("package").notNull(),
//     main: p.boolean("main").notNull(),
//     stdWeight: p.numeric("std_weight", { precision: 10, scale: 3 }).notNull(),
//     maxWeight: p.numeric("max_weight", { precision: 10, scale: 3 }).notNull(),
//     minWeight: p.numeric("min_weight", { precision: 10, scale: 3 }).notNull(),
//     length: p.numeric({ precision: 10, scale: 3 }).notNull(),
//     width: p.numeric({ precision: 10, scale: 3 }).notNull(),
//     height: p.numeric({ precision: 10, scale: 3 }).notNull(),
//     vol: p.numeric({ precision: 10, scale: 3 }).notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [p.index("products_packages_region_updated_idx").on(t.region, t.updatedAt)],
// );
//
// export const pvProductLineTable = msCore.table(
//   "products_lines",
//   {
//     id: p.serial("id").primaryKey(),
//     productId: p
//       .integer("product_id")
//       .references(() => productTable.id, { onDelete: "restrict" })
//       .notNull(),
//     lineId: p
//       .integer("line_id")
//       .references(() => lineTable.id, { onDelete: "restrict" })
//       .notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("product_line_key").on(t.productId, t.lineId),
//     p.index("products_lines_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("products_lines_product_id_idx").on(t.productId),
//     p.index("products_lines_line_id_idx").on(t.lineId),
//   ],
// );
//
// export const downtimeCategory = msDowntime.enum("downtime_cat", [
//   "PLANNED",
//   "UNPLANNED",
//   "SMALL_STOP",
// ]);
//
// export const downtimeReasonTable = msDowntime.table(
//   "downtime_reasons",
//   {
//     ...defaultColumns(),
//     category: downtimeCategory("category").notNull(),
//   },
//   (t) => [...defaultIndexes(t, "dr")],
// );
//
// export const downtimeReasonAreaTable = msDowntime.table(
//   "downtime_reasons_areas",
//   {
//     id: p.serial("id").primaryKey(),
//     reasonId: p
//       .integer("reason_id")
//       .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
//       .notNull(),
//     areaId: p.integer("area_id").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("dra_key").on(t.reasonId, t.areaId),
//     p.index("dra_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("dra_area_id_idx").on(t.areaId),
//     p.index("dra_reason_id_idx").on(t.reasonId),
//   ],
// );
//
// export const downtimeReasonLineTable = msDowntime.table(
//   "downtime_reasons_lines",
//   {
//     id: p.serial("id").primaryKey(),
//     reasonId: p
//       .integer("reason_id")
//       .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
//       .notNull(),
//     lineId: p.integer("line_id").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("downtime_reasons_lines_key").on(t.reasonId, t.lineId),
//     p.index("downtime_reasons_lines_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("downtime_reasons_lines_line_id_idx").on(t.lineId),
//     p.index("downtime_reasons_lines_reason_id_idx").on(t.reasonId),
//   ],
// );
//
// export const downtimeReasonMachineTable = msDowntime.table(
//   "downtime_reasons_machines",
//   {
//     id: p.serial("id").primaryKey(),
//     reasonId: p
//       .integer("reason_id")
//       .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
//       .notNull(),
//     machineId: p.integer("machine_id").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("downtime_reasons_machines_key").on(t.reasonId, t.machineId),
//     p.index("downtime_reasons_machines_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("downtime_reasons_machines_machine_id_idx").on(t.machineId),
//     p.index("downtime_reasons_machines_reason_id_idx").on(t.reasonId),
//   ],
// );
//
// export const downtimeActionTable = msDowntime.table(
//   "downtime_actions",
//   {
//     ...defaultColumnsWithCode(),
//     color: p.varchar({ length: 10 }).notNull(),
//   },
//   (t) => [...defaultIndexesWithCode(t, "downtime_actions")],
// );
//
// export const rejectReasonTable = msReject.table(
//   "reject_reasons",
//   {
//     ...defaultColumnsWithCode(),
//   },
//   (t) => [...defaultIndexesWithCode(t, "reject_reasons")],
// );
//
// export const rejectReasonAreaTable = msReject.table(
//   "reject_reasons_areas",
//   {
//     id: p.serial("id").primaryKey(),
//     reasonId: p
//       .integer("reason_id")
//       .references(() => rejectReasonTable.id, { onDelete: "cascade" })
//       .notNull(),
//     areaId: p.integer("area_id").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("reject_reasons_areas_key").on(t.reasonId, t.areaId),
//     p.index("reject_reasons_areas_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("reject_reasons_areas_area_id_idx").on(t.areaId),
//     p.index("reject_reasons_areas_reason_id_idx").on(t.reasonId),
//   ],
// );
//
// export const rejectReasonLineTable = msReject.table(
//   "reject_reasons_lines",
//   {
//     id: p.serial("id").primaryKey(),
//     reasonId: p
//       .integer("reason_id")
//       .references(() => rejectReasonTable.id, { onDelete: "cascade" })
//       .notNull(),
//     lineId: p.integer("line_id").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("reject_reasons_lines_key").on(t.reasonId, t.lineId),
//     p.index("reject_reasons_lines_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("reject_reasons_lines_line_id_idx").on(t.lineId),
//     p.index("reject_reasons_lines_reason_id_idx").on(t.reasonId),
//   ],
// );
//
// export const rejectReasonMachineTable = msReject.table(
//   "reject_reasons_machines",
//   {
//     id: p.serial("id").primaryKey(),
//     reasonId: p
//       .integer("reason_id")
//       .references(() => rejectReasonTable.id, { onDelete: "cascade" })
//       .notNull(),
//     machineId: p.integer("machine_id").notNull(),
//     region: p.varchar({ length: 10 }).notNull(),
//     createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//     updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
//   },
//   (t) => [
//     p.unique("reject_reasons_machines_key").on(t.reasonId, t.machineId),
//     p.index("reject_reasons_machines_region_updated_idx").on(t.region, t.updatedAt),
//     p.index("reject_reasons_machines_machine_id_idx").on(t.machineId),
//     p.index("reject_reasons_machines_reason_id_idx").on(t.reasonId),
//   ],
// );
