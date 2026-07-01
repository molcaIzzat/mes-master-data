import * as p from "drizzle-orm/pg-core";

const defaultColumns = () => ({
  id: p.serial("id").primaryKey(),
  region: p.varchar({ length: 10 }).notNull(),
  createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const defaultColumnsWithCode = () => ({
  ...defaultColumns(),
  code: p.varchar({ length: 100 }).notNull(),
  name: p.varchar({ length: 100 }).notNull(),
});

const defaultIndexes = (
  t: {
    region: p.PgColumn;
    updatedAt: p.PgColumn;
  },
  tableName: string,
) => [p.index(`${tableName}_region_updated_idx`).on(t.region, t.updatedAt)];

const defaultIndexesWithCode = (
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

export const LineCategoryEnum = msCore.enum("line_cat", ["PACKAGE", "BULK"]);

export const areaTable = msCore.table(
  "areas",
  {
    ...defaultColumns(),
    factoryId: p.integer("factory_id"),
    name: p.varchar("name").notNull(),
    displayName: p.varchar("display_name", { length: 255 }),
  },
  (t) => [
    ...defaultIndexes(t, "areas"),
    p.unique(`areas_name_region_key`).on(t.name, t.region),
    p.index("areas_factory_id_idx").on(t.factoryId),
  ],
);

export const lineTable = msCore.table(
  "lines",
  {
    ...defaultColumnsWithCode(),
    areaId: p
      .integer("area_id")
      .references(() => areaTable.id, { onDelete: "restrict" })
      .notNull(),
    category: LineCategoryEnum("category").notNull(),
  },
  (t) => [...defaultIndexesWithCode(t, "lines"), p.index("lines_area_id_idx").on(t.areaId)],
);

export const machineTable = msCore.table(
  "machines",
  {
    ...defaultColumnsWithCode(),
    lineId: p
      .integer("line_id")
      .references(() => lineTable.id, { onDelete: "restrict" })
      .notNull(),
    isMain: p.boolean("is_main").notNull(),
  },
  (t) => [...defaultIndexesWithCode(t, "machines"), p.index("machines_line_id_idx").on(t.lineId)],
);

export const subMachineTable = msCore.table(
  "sub_machines",
  {
    ...defaultColumnsWithCode(),
    machineId: p
      .integer("machine_id")
      .references(() => machineTable.id, { onDelete: "restrict" })
      .notNull(),
  },
  (t) => [
    ...defaultIndexesWithCode(t, "sub_machines"),
    p.index("sub_machines_machine_id_idx").on(t.machineId),
  ],
);

export const ProductCycleTimeUnitEnum = msCore.enum("product_cycle_time_unit", [
  "BAG_PER_MINUTE",
  "SHOT_PER_MINUTE",
  "SAK_PER_MINUTE",
  "PCS_PER_MINUTE",
]);

export const ProductPackagingTypeEnum = msCore.enum("product_packaing_type", [
  "BAG",
  "SHOT",
  "CALENDER",
  "INNER",
  "CARTON",
  "SAK",
]);

export const productTable = msCore.table(
  "products",
  {
    ...defaultColumnsWithCode(),
    cycleTime: p.numeric("cycle_time", { precision: 15, scale: 3, mode: "number" }).notNull(),
    cycleTimeUnit: ProductCycleTimeUnitEnum("cycle_time_unit").notNull(),
    areaId: p
      .integer("area_id")
      .references(() => areaTable.id, { onDelete: "restrict" })
      .notNull(),
    price: p.numeric({ precision: 15, scale: 3, mode: "number" }),
    cost: p.numeric({ precision: 15, scale: 3, mode: "number" }),
  },
  (t) => [...defaultIndexesWithCode(t, "products"), p.index("products_area_id_idx").on(t.areaId)],
);

export const productConvertionTable = msCore.table(
  "product_convertions",
  {
    id: p.serial("id").primaryKey(),
    sortOrder: p.integer("sort_order").notNull(),
    productId: p
      .integer("product_id")
      .references(() => productTable.id, { onDelete: "cascade" })
      .notNull(),
    unit: p.varchar({ length: 100 }).notNull(),
    value: p.numeric({ precision: 15, scale: 3 }).notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [p.index("product_conversions_region_updated_idx").on(t.region, t.updatedAt)],
);

export const productCycleTimeMachineTable = msCore.table(
  "product_cycle_time_machines",
  {
    id: p.serial("id").primaryKey(),
    productId: p
      .integer("product_id")
      .references(() => productTable.id, { onDelete: "restrict" })
      .notNull(),
    machineId: p
      .integer("machine_id")
      .references(() => machineTable.id, { onDelete: "cascade" })
      .notNull(),
    productCode: p.varchar("product_code", { length: 100 }).notNull(),
    machineCode: p.varchar("machine_code", { length: 100 }).notNull(),
    cycleTime: p.numeric("cycle_time", { precision: 15, scale: 3, mode: "number" }).notNull(),
    cycleTimeUnit: ProductCycleTimeUnitEnum("cycle_time_unit").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("product_cycle_time_machines_key").on(t.productId, t.machineId),
    p.index("product_cycle_time_machines_region_updated_idx").on(t.region, t.updatedAt),
    p.index("products_cycle_time_machines_machine_id_idx").on(t.machineId),
  ],
);

export const productPackagingTable = msCore.table(
  "product_packages",
  {
    id: p.serial("id").primaryKey(),
    productId: p
      .integer("product_id")
      .references(() => productTable.id, { onDelete: "cascade" })
      .notNull(),
    sortOrder: p.integer("sort_order").notNull(),
    package: ProductPackagingTypeEnum("package").notNull(),
    main: p.boolean("main").notNull(),
    stdWeight: p.numeric("std_weight", { precision: 10, scale: 3 }).notNull(),
    maxWeight: p.numeric("max_weight", { precision: 10, scale: 3 }).notNull(),
    minWeight: p.numeric("min_weight", { precision: 10, scale: 3 }).notNull(),
    length: p.numeric({ precision: 10, scale: 3 }).notNull(),
    width: p.numeric({ precision: 10, scale: 3 }).notNull(),
    height: p.numeric({ precision: 10, scale: 3 }).notNull(),
    vol: p.numeric({ precision: 10, scale: 3 }).notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [p.index("products_packages_region_updated_idx").on(t.region, t.updatedAt)],
);

export const pvProductLineTable = msCore.table(
  "products_lines",
  {
    id: p.serial("id").primaryKey(),
    productId: p
      .integer("product_id")
      .references(() => productTable.id, { onDelete: "restrict" })
      .notNull(),
    lineId: p
      .integer("line_id")
      .references(() => lineTable.id, { onDelete: "restrict" })
      .notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("product_line_key").on(t.productId, t.lineId),
    p.index("products_lines_region_updated_idx").on(t.region, t.updatedAt),
    p.index("products_lines_product_id_idx").on(t.productId),
    p.index("products_lines_line_id_idx").on(t.lineId),
  ],
);

export const DowntimeCategoryEnum = msDowntime.enum("downtime_cat", [
  "PLANNED",
  "UNPLANNED",
  "SMALL_STOP",
]);

export const downtimeReasonTable = msDowntime.table(
  "downtime_reasons",
  {
    ...defaultColumnsWithCode(),
    category: DowntimeCategoryEnum("category").notNull(),
  },
  (t) => [...defaultIndexesWithCode(t, "downtime_reasons")],
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
    p.unique("downtime_reasons_areas_key").on(t.reasonId, t.areaId),
    p.index("downtime_reasons_areas_region_updated_idx").on(t.region, t.updatedAt),
    p.index("downtime_reasons_areas_area_id_idx").on(t.areaId),
    p.index("downtime_reasons_areas_reason_id_idx").on(t.reasonId),
  ],
);

export const downtimeReasonLineTable = msDowntime.table(
  "downtime_reasons_lines",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    lineId: p.integer("line_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("downtime_reasons_lines_key").on(t.reasonId, t.lineId),
    p.index("downtime_reasons_lines_region_updated_idx").on(t.region, t.updatedAt),
    p.index("downtime_reasons_lines_line_id_idx").on(t.lineId),
    p.index("downtime_reasons_lines_reason_id_idx").on(t.reasonId),
  ],
);

export const downtimeReasonMachineTable = msDowntime.table(
  "downtime_reasons_machines",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => downtimeReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    machineId: p.integer("machine_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("downtime_reasons_machines_key").on(t.reasonId, t.machineId),
    p.index("downtime_reasons_machines_region_updated_idx").on(t.region, t.updatedAt),
    p.index("downtime_reasons_machines_machine_id_idx").on(t.machineId),
    p.index("downtime_reasons_machines_reason_id_idx").on(t.reasonId),
  ],
);

export const rejectReasonTable = msReject.table(
  "reject_reasons",
  {
    ...defaultColumnsWithCode(),
  },
  (t) => [...defaultIndexesWithCode(t, "reject_reasons")],
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

export const rejectReasonLineTable = msReject.table(
  "reject_reasons_lines",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => rejectReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    lineId: p.integer("line_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("reject_reasons_lines_key").on(t.reasonId, t.lineId),
    p.index("reject_reasons_lines_region_updated_idx").on(t.region, t.updatedAt),
    p.index("reject_reasons_lines_line_id_idx").on(t.lineId),
    p.index("reject_reasons_lines_reason_id_idx").on(t.reasonId),
  ],
);

export const rejectReasonMachineTable = msReject.table(
  "reject_reasons_machines",
  {
    id: p.serial("id").primaryKey(),
    reasonId: p
      .integer("reason_id")
      .references(() => rejectReasonTable.id, { onDelete: "cascade" })
      .notNull(),
    machineId: p.integer("machine_id").notNull(),
    region: p.varchar({ length: 10 }).notNull(),
    createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    p.unique("reject_reasons_machines_key").on(t.reasonId, t.machineId),
    p.index("reject_reasons_machines_region_updated_idx").on(t.region, t.updatedAt),
    p.index("reject_reasons_machines_machine_id_idx").on(t.machineId),
    p.index("reject_reasons_machines_reason_id_idx").on(t.reasonId),
  ],
);
