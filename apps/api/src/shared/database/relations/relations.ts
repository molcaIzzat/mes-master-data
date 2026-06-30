import { defineRelations } from "drizzle-orm";
import * as schema from "../schema/schema.js";

const relations = defineRelations(schema, (r) => ({
  areaTable: {
    lines: r.many.lineTable(),
  },
  lineTable: {
    machines: r.many.machineTable(),
    area: r.one.areaTable({
      from: r.lineTable.areaId,
      to: r.areaTable.id,
    }),
  },
  machineTable: {
    machines: r.many.subMachineTable(),
    line: r.one.lineTable({
      from: r.machineTable.lineId,
      to: r.lineTable.id,
    }),
  },
  subMachineTable: {
    machine: r.one.machineTable({
      from: r.subMachineTable.machineId,
      to: r.machineTable.id,
    }),
  },
  productTable: {
    convertions: r.many.productConvertionTable(),
    packages: r.many.productPackagingTable(),
    lines: r.many.pvProductLineTable(),
    cycleTimeMachines: r.many.productCycleTimeMachineTable(),
    area: r.one.areaTable({
      from: r.productTable.areaId,
      to: r.areaTable.id,
    }),
  },
  productPackagingTable: {
    product: r.one.productTable({
      from: r.productPackagingTable.productId,
      to: r.productTable.id,
    }),
  },
  productConvertionTable: {
    product: r.one.productTable({
      from: r.productConvertionTable.productId,
      to: r.productTable.id,
    }),
  },
  productCycleTimeMachineTable: {
    product: r.one.productTable({
      from: r.productCycleTimeMachineTable.productId,
      to: r.productTable.id,
    }),
    machine: r.one.machineTable({
      from: r.productCycleTimeMachineTable.machineId,
      to: r.machineTable.id,
    }),
  },
  pvProductLineTable: {
    product: r.one.productTable({
      from: r.pvProductLineTable.productId,
      to: r.productTable.id,
    }),
    line: r.one.lineTable({
      from: r.pvProductLineTable.lineId,
      to: r.lineTable.id,
    }),
  },
}));

export { relations };
