import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";

import type { Position } from "../helper/common.js";

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

export const countRole = msCore.enum("count_role", [
  "infeed",
  "good_output",
  "reject",
  "good_weight",
  "reject_weight",
  "total_weight",
]);
export const countSource = msCore.enum("count_source", ["plc", "manual"]);

export const unitTable = msCore.table(
  "uom",
  {
    ...defaultColumns(),
  },
  (t) => [...defaultIndexes(t, "uom")],
);

export const enterpriseTable = msCore.table(
  "enterprices",
  {
    ...defaultColumns(),
  },
  (t) => [...defaultIndexes(t, "enterprices")],
);

export const siteTable = msCore.table(
  "sites",
  {
    ...defaultColumns(),
    enterpriseId: p.integer("enterprise_id"),
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

export const workCenterClassTable = msCore.table(
  "work_center_classes",
  {
    ...defaultColumns(),
  },
  (t) => [...defaultIndexes(t, "wcc")],
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
    workCenterClassId: p
      .integer()
      .references(() => workCenterClassTable.id, { onDelete: "restrict" }),
    idealRatePerHour: p.numeric("ideal_rate_per_hour"),
    position: p.jsonb("position").$type<Position>().notNull().default({ x: 0, y: 0 }),
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
      .references(() => workCenterTable.id, { onDelete: "restrict" }),
    workUnitClassId: p
      .integer("work_unit_class_id")
      .references(() => workUnitClassTable.id, { onDelete: "restrict" }),
    type: workUnitType("type").notNull(),
    isOeeRelevant: p.boolean("is_oee_relevant").notNull().default(true),
    isAcquirable: p.boolean("is_acuirable").notNull().default(true),
    telemetryTags: p.jsonb("telemetry_tags").$type<Record<string, string>>(),
    position: p.jsonb("position").$type<Position>().notNull().default({ x: 0, y: 0 }),
  },
  (t) => [...defaultIndexes(t, "wu"), p.index("wu_wc_id_idx").on(t.workCenterId)],
);

export const workUnitFlowTable = msCore.table(
  "work_unit_flows",
  {
    id: p.serial("id").primaryKey(),
    workCenterId: p
      .integer("work_center_id")
      .notNull()
      .references(() => workCenterTable.id, { onDelete: "restrict" }),
    fromWorkUnitId: p
      .integer("from_work_unit_id")
      .notNull()
      .references(() => workUnitTable.id, { onDelete: "cascade" }),
    toWorkUnitId: p
      .integer("to_work_unit_id")
      .notNull()
      .references(() => workUnitTable.id, { onDelete: "cascade" }),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("wuf_from_wu_to_wu_keys").on(t.fromWorkUnitId, t.toWorkUnitId),
    p.index("wuf_region_updated_idx").on(t.region, t.updatedAt),
    p.index("wuf_wc_id_idx").on(t.workCenterId),
    p.index("wuf_to_wu_id_idx").on(t.toWorkUnitId),
    p.index("wuf_from_wu_id_idx").on(t.fromWorkUnitId),
    p.check("wuf_no_self_loop", sql`from_work_unit_id <> to_work_unit_id`),
  ],
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
      .references(() => workUnitTable.id, { onDelete: "restrict" }),
    equipmentClassId: p
      .integer()
      .references(() => equipmentClassTable.id, { onDelete: "restrict" }),
    productSignalTag: p.varchar("product_signal_tag", { length: 255 }).notNull(), // OPC-UA node id / Telegraf tag
  },
  (t) => [...defaultIndexes(t, "equipments"), p.index("equipments_wu_id_idx").on(t.workUnitId)],
);

export const countPointTable = msCore.table(
  "count_points",
  {
    id: p.serial("id").primaryKey(),
    workUnitId: p
      .integer("work_unit_id")
      .notNull()
      .references(() => workUnitTable.id, { onDelete: "cascade" }),
    equipmentId: p
      .integer("equipment_id")
      .references(() => equipmentTable.id, { onDelete: "cascade" }),
    role: countRole("role").notNull(),
    uomId: p
      .integer("uom_id")
      .notNull()
      .references(() => unitTable.id, { onDelete: "restrict" }),
    source: countSource("source").notNull().default("plc"),
    sourceTag: p.varchar("source_tag", { length: 255 }).notNull(), // OPC-UA node id / Telegraf tag
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("cp_wu_role_source_tag_key").on(t.workUnitId, t.role, t.sourceTag),
    p.index("cp_region_updated_idx").on(t.region, t.updatedAt),
    p.index("cp_wu_id_idx").on(t.workUnitId),
    p.check(
      "cp_source_tag_cx",
      sql`
    (source = 'plc'    AND source_tag IS NOT NULL) OR
    (source = 'manual' AND source_tag IS NULL)
  `,
    ),
  ],
);

export const productTable = msCore.table(
  "products",
  {
    ...defaultColumns(),
    areaId: p
      .integer("area_id")
      .references(() => areaTable.id, { onDelete: "restrict" })
      .notNull(),
    baseUomId: p
      .integer("base_uom_id")
      .notNull()
      .references(() => unitTable.id, { onDelete: "restrict" }),
    idealRatePerHour: p.numeric("ideal_rate_per_hour"),
    price: p.numeric({ precision: 15, scale: 3 }),
    cost: p.numeric({ precision: 15, scale: 3 }),
  },
  (t) => [...defaultIndexes(t, "products"), p.index("products_area_id_idx").on(t.areaId)],
);

export const productPackagingTable = msCore.table(
  "product_packages",
  {
    id: p.serial("id").primaryKey(),
    sortOrder: p.integer("sort_order").notNull(),
    productId: p
      .integer("product_id")
      .notNull()
      .references(() => productTable.id, { onDelete: "cascade" }),
    uomId: p
      .integer("uom_id")
      .notNull()
      .references(() => unitTable.id, { onDelete: "restrict" }),
    main: p.boolean("main").notNull(),
    stdWeight: p.numeric("std_weight", { precision: 10, scale: 3 }),
    maxWeight: p.numeric("max_weight", { precision: 10, scale: 3 }),
    minWeight: p.numeric("min_weight", { precision: 10, scale: 3 }),
    length: p.numeric({ precision: 10, scale: 3 }),
    width: p.numeric({ precision: 10, scale: 3 }),
    height: p.numeric({ precision: 10, scale: 3 }),
    vol: p.numeric({ precision: 10, scale: 3 }),
    factorToBase: p.numeric("factor_to_base", { precision: 10, scale: 3 }).notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("product_packages_product_uom_key").on(t.productId, t.uomId),
    p.index("products_packages_region_updated_idx").on(t.region, t.updatedAt),
    p.index("product_packages_product_id_idx").on(t.productId),
    p.index("product_packages_uom_id_idx").on(t.uomId),
    p.check("pconv_pconv_ftb_cx", sql`factor_to_base > 0`),
  ],
);

export const productCodeAliasTable = msCore.table(
  "product_code_aliases",
  {
    id: p.serial("id").primaryKey(),
    workUnitId: p
      .integer("work_unit_id")
      .notNull()
      .references(() => workUnitTable.id, { onDelete: "cascade" }),
    equipmentId: p
      .integer("equipment_id")
      .notNull()
      .references(() => equipmentTable.id, { onDelete: "cascade" }),
    productId: p
      .integer("product_id")
      .notNull()
      .references(() => productTable.id, { onDelete: "cascade" }),
    externalCode: p.text("external_code").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("pca_external_key").on(t.equipmentId, t.externalCode),
    p.index("pca_region_updated_idx").on(t.region, t.updatedAt),
    p.index("pca_product_id_idx").on(t.productId),
    p.index("pca_equipment_id_idx").on(t.equipmentId),
  ],
);

export const productWorkUnitSpecTable = msCore.table(
  "product_work_unit_specs",
  {
    id: p.serial("id").primaryKey(),
    productId: p
      .integer("product_id")
      .notNull()
      .references(() => productTable.id, { onDelete: "cascade" }),
    workUnitId: p
      .integer("wor_unit_id")
      .notNull()
      .references(() => workUnitTable.id, { onDelete: "cascade" }),
    uomId: p
      .integer("uom_id")
      .notNull()
      .references(() => unitTable.id, { onDelete: "cascade" }),
    idealRatePerHour: p.numeric("ideal_rate_per_hour", { precision: 15, scale: 3 }).notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("pes_product_wu_key").on(t.productId, t.workUnitId),
    p.index("pes_region_updated_idx").on(t.region, t.updatedAt),
    p.index("pes_work_unit_id_idx").on(t.workUnitId),
    p.index("pes_product_id_idx").on(t.productId),
    p.index("pes_uom_id_idx").on(t.uomId),
  ],
);

export const productWorkCenterTable = msCore.table(
  "products_work_centers",
  {
    id: p.serial("id").primaryKey(),
    productId: p
      .integer("product_id")
      .notNull()
      .references(() => productTable.id, { onDelete: "cascade" }),
    workCenterId: p
      .integer("work_center_id")
      .references(() => workCenterTable.id, { onDelete: "cascade" })
      .notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("pwc_key").on(t.productId, t.workCenterId),
    p.index("pwc_region_updated_idx").on(t.region, t.updatedAt),
    p.index("pwc_product_id_idx").on(t.productId),
  ],
);

export const downtimeCategory = msDowntime.enum("downtime_cat", [
  "PLANNED",
  "UNPLANNED",
  "SMALL_STOP",
]);

export const downtimeReasonTable = msDowntime.table(
  "downtime_reasons",
  {
    ...defaultColumns(),
    category: downtimeCategory("category").notNull(),
  },
  (t) => [...defaultIndexes(t, "dr")],
);

export const downtimeReasonAreaTable = msDowntime.table(
  "downtime_reasons_areas",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    areaId: p.integer("area_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("dra_key").on(t.reasonId, t.areaId),
    p.index("dra_region_updated_idx").on(t.region, t.updatedAt),
    p.index("dra_area_id_idx").on(t.areaId),
    p.index("dra_reason_id_idx").on(t.reasonId),
  ],
);

export const downtimeReasonWorkCenterTable = msDowntime.table(
  "downtime_reasons_work_centers",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    workCenterId: p.integer("work_center_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("drwc_key").on(t.reasonId, t.workCenterId),
    p.index("drwc_region_updated_idx").on(t.region, t.updatedAt),
    p.index("drwc_line_id_idx").on(t.workCenterId),
    p.index("drwc_reason_id_idx").on(t.reasonId),
  ],
);

export const downtimeReasonEquipmentTable = msDowntime.table(
  "downtime_reasons_equipments",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    equipmentId: p.integer("equipment_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("dre_key").on(t.reasonId, t.equipmentId),
    p.index("dre_region_updated_idx").on(t.region, t.updatedAt),
    p.index("dre_machine_id_idx").on(t.equipmentId),
    p.index("dre_reason_id_idx").on(t.reasonId),
  ],
);

export const downtimeActionTable = msDowntime.table(
  "downtime_actions",
  {
    ...defaultColumns(),
    color: p.varchar({ length: 10 }).notNull(),
  },
  (t) => [...defaultIndexes(t, "downtime_actions")],
);

export const rejectReasonTable = msReject.table(
  "reject_reasons",
  {
    ...defaultColumns(),
  },
  (t) => [...defaultIndexes(t, "reject_reasons")],
);

export const rejectReasonAreaTable = msReject.table(
  "reject_reasons_areas",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => rejectReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    areaId: p.integer("area_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("reject_reasons_areas_key").on(t.reasonId, t.areaId),
    p.index("reject_reasons_areas_region_updated_idx").on(t.region, t.updatedAt),
    p.index("reject_reasons_areas_area_id_idx").on(t.areaId),
    p.index("reject_reasons_areas_reason_id_idx").on(t.reasonId),
  ],
);

export const rejectReasonWorkCenterTable = msReject.table(
  "reject_reasons_work_centers",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => rejectReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    workCenterId: p.integer("work_center_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("rrwc_key").on(t.reasonId, t.workCenterId),
    p.index("rrwc_region_updated_idx").on(t.region, t.updatedAt),
    p.index("rrwc_line_id_idx").on(t.workCenterId),
    p.index("rrwc_reason_id_idx").on(t.reasonId),
  ],
);

export const rejectReasonEquipmentTable = msReject.table(
  "reject_reasons_equipments",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => rejectReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    equipmentId: p.integer("equipment_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("rre_key").on(t.reasonId, t.equipmentId),
    p.index("rre_region_updated_idx").on(t.region, t.updatedAt),
    p.index("rre_machine_id_idx").on(t.equipmentId),
    p.index("rre_reason_id_idx").on(t.reasonId),
  ],
);
