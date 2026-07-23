import { defineRelations } from "drizzle-orm";
import * as schema from "../schema/schema.js";

const relations = defineRelations(schema, (r) => ({
  enterpriseTable: {},
  siteTable: {
    areas: r.many.areaTable(),
  },
  areaTable: {
    site: r.one.siteTable({
      from: r.areaTable.siteId,
      to: r.siteTable.id,
    }),
    workCenters: r.many.workCenterTable(),
    products: r.many.productTable(),
  },
  workCenterClassTable: {
    workCenters: r.many.workCenterTable(),
  },
  workCenterTable: {
    area: r.one.areaTable({
      from: r.workCenterTable.areaId,
      to: r.areaTable.id,
    }),
    class: r.one.workCenterClassTable({
      from: r.workCenterTable.workCenterClassId,
      to: r.workCenterClassTable.id,
    }),
    units: r.many.workUnitTable(),
    unitFlows: r.many.workUnitFlowTable(),
    products: r.many.productWorkCenterTable(),
  },
  workUnitClassTable: {
    units: r.many.workUnitTable(),
  },
  workUnitTable: {
    workCenter: r.one.workCenterTable({
      from: r.workUnitTable.workCenterId,
      to: r.workCenterTable.id,
    }),
    class: r.one.workUnitClassTable({
      from: r.workUnitTable.workUnitClassId,
      to: r.workUnitClassTable.id,
    }),
    countPoints: r.many.countPointTable(),
    equipments: r.many.equipmentTable(),
    flowFrom: r.many.workUnitFlowTable({
      alias: "from",
    }),
    toFlow: r.many.workUnitFlowTable({
      alias: "to",
    }),
    productSpecs: r.many.productWorkUnitSpecTable(),
  },
  equipmentClassTable: {
    equipments: r.many.equipmentTable(),
  },
  equipmentTable: {
    unit: r.one.workUnitTable({
      from: r.equipmentTable.workUnitId,
      to: r.workUnitTable.id,
    }),
    class: r.one.equipmentClassTable({
      from: r.equipmentTable.equipmentClassId,
      to: r.equipmentClassTable.id,
    }),
    productAliases: r.many.productCodeAliasTable(),
    countPoints: r.many.countPointTable(),
  },
  countPointTable: {
    unit: r.one.workUnitTable({
      from: r.countPointTable.workUnitId,
      to: r.workUnitTable.id,
    }),
    equipment: r.one.equipmentTable({
      from: r.countPointTable.equipmentId,
      to: r.equipmentTable.id,
    }),
    uom: r.one.unitTable({
      from: r.countPointTable.uomId,
      to: r.unitTable.id,
    }),
  },
  workUnitFlowTable: {
    workCenter: r.one.workCenterTable({
      from: r.workUnitFlowTable.workCenterId,
      to: r.workCenterTable.id,
    }),
    from: r.one.workUnitTable({
      from: r.workUnitFlowTable.fromWorkUnitId,
      to: r.workUnitTable.id,
      alias: "from",
    }),
    to: r.one.workUnitTable({
      from: r.workUnitFlowTable.toWorkUnitId,
      to: r.workUnitTable.id,
      alias: "to",
    }),
  },
  unitTable: {
    products: r.many.productTable(),
    productPackages: r.many.productPackagingTable(),
    productSpecs: r.many.productWorkUnitSpecTable(),
  },
  productTable: {
    area: r.one.areaTable({
      from: r.productTable.areaId,
      to: r.areaTable.id,
    }),
    baseUom: r.one.unitTable({
      from: r.productTable.baseUomId,
      to: r.unitTable.id,
    }),
    packages: r.many.productPackagingTable(),
    aliases: r.many.productCodeAliasTable(),
    specs: r.many.productWorkUnitSpecTable(),
    workCenters: r.many.productWorkCenterTable(),
  },
  productPackagingTable: {
    product: r.one.productTable({
      from: r.productPackagingTable.productId,
      to: r.productTable.id,
    }),
    uom: r.one.unitTable({
      from: r.productPackagingTable.uomId,
      to: r.unitTable.id,
    }),
  },
  productCodeAliasTable: {
    product: r.one.productTable({
      from: r.productCodeAliasTable.productId,
      to: r.productTable.id,
    }),
    equipment: r.one.equipmentTable({
      from: r.productCodeAliasTable.equipmentId,
      to: r.equipmentTable.id,
    }),
  },
  productWorkUnitSpecTable: {
    product: r.one.productTable({
      from: r.productWorkUnitSpecTable.productId,
      to: r.productTable.id,
    }),
    unit: r.one.workUnitTable({
      from: r.productWorkUnitSpecTable.workUnitId,
      to: r.workUnitTable.id,
    }),
    uom: r.one.unitTable({
      from: r.productWorkUnitSpecTable.uomId,
      to: r.unitTable.id,
    }),
  },
  productWorkCenterTable: {
    workCenter: r.one.workCenterTable({
      from: r.productWorkCenterTable.workCenterId,
      to: r.workCenterTable.id,
    }),
    product: r.one.productTable({
      from: r.productWorkCenterTable.productId,
      to: r.productTable.id,
    }),
  },
  downtimeReasonTable: {
    areas: r.many.downtimeReasonAreaTable(),
    workCenters: r.many.downtimeReasonWorkCenterTable(),
    equipments: r.many.downtimeReasonEquipmentTable(),
  },
  downtimeReasonAreaTable: {
    reason: r.one.downtimeReasonTable({
      from: r.downtimeReasonAreaTable.reasonId,
      to: r.downtimeReasonTable.id,
    }),
  },
  downtimeReasonWorkCenterTable: {
    reason: r.one.downtimeReasonTable({
      from: r.downtimeReasonWorkCenterTable.reasonId,
      to: r.downtimeReasonTable.id,
    }),
  },
  downtimeReasonEquipmentTable: {
    reason: r.one.downtimeReasonTable({
      from: r.downtimeReasonEquipmentTable.reasonId,
      to: r.downtimeReasonTable.id,
    }),
  },
  rejectReasonTable: {
    areas: r.many.rejectReasonAreaTable(),
    workCenters: r.many.rejectReasonWorkCenterTable(),
    equipments: r.many.rejectReasonEquipmentTable(),
  },
  rejectReasonAreaTable: {
    reason: r.one.rejectReasonTable({
      from: r.rejectReasonAreaTable.reasonId,
      to: r.rejectReasonTable.id,
    }),
  },
  rejectReasonWorkCenterTable: {
    reason: r.one.rejectReasonTable({
      from: r.rejectReasonWorkCenterTable.reasonId,
      to: r.rejectReasonTable.id,
    }),
  },
  rejectReasonEquipmentTable: {
    reason: r.one.rejectReasonTable({
      from: r.rejectReasonEquipmentTable.reasonId,
      to: r.rejectReasonTable.id,
    }),
  },
  downtimeActionTable: {},
}));

export { relations };
