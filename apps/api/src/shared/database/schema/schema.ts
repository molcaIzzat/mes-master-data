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
) => [p.index(`${tableName}_region_org_updated_idx`).on(t.region, t.updatedAt)];

const defaultIndexesWithCode = (
  t: {
    code: p.PgColumn;
    region: p.PgColumn;
    updatedAt: p.PgColumn;
  },
  tableName: string,
) => [
  p.unique(`${tableName}_code_region_key`).on(t.code, t.region),
  p.index(`${tableName}_region_org_updated_idx`).on(t.region, t.updatedAt),
];

export const msCore = p.pgSchema("ms_core");

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
