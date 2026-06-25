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
}));

export { relations };
