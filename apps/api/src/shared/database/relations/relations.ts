import { defineRelations } from "drizzle-orm";
import * as schema from "../schema/schema.js";

const relations = defineRelations(schema, (r) => ({
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
    equipmentFlows: r.many.equipmentFlowTable(),
    products: r.many.productWorkCenterTable(),
  },
  workUnitTable: {
    workCenter: r.one.workCenterTable({
      from: r.workUnitTable.workCenterId,
      to: r.workCenterTable.id,
    }),
    equipments: r.many.equipmentTable(),
  },
  equipmentClassTable: {
    equipments: r.many.equipmentTable(),
  },
  equipmentTable: {
    unit: r.one.workUnitTable({
      from: r.equipmentTable.workUnitId,
      to: r.workUnitTable.id,
    }),
    parent: r.one.equipmentTable({
      from: r.equipmentTable.parentEquipmentId,
      to: r.equipmentTable.id,
    }),
    class: r.one.equipmentClassTable({
      from: r.equipmentTable.equipmentClassId,
      to: r.equipmentClassTable.id,
    }),
    madeByFrom: r.many.equipmentTable(),
    oeeCountPoints: r.many.oeeCountPointTable(),
    flowFrom: r.many.equipmentFlowTable({
      alias: "from",
    }),
    flowTo: r.many.equipmentFlowTable({
      alias: "to",
    }),
    productAliases: r.many.productCodeAliasTable(),
    productSpecs: r.many.productEquipmentSpecTable(),
  },
  oeeCountPointTable: {
    equipment: r.one.equipmentTable({
      from: r.oeeCountPointTable.equipmentId,
      to: r.equipmentTable.id,
    }),
  },
  equipmentFlowTable: {
    workCenter: r.one.workCenterTable({
      from: r.equipmentFlowTable.workCenterId,
      to: r.workCenterTable.id,
    }),
    from: r.one.equipmentTable({
      from: r.equipmentFlowTable.fromEquipmentId,
      to: r.equipmentTable.id,
      alias: "from",
    }),
    to: r.one.equipmentTable({
      from: r.equipmentFlowTable.toEquipmentId,
      to: r.equipmentTable.id,
      alias: "to",
    }),
  },
  unitTable: {
    products: r.many.productTable(),
    productPackages: r.many.productPackagingTable(),
    productConvertions: r.many.productConvertionTable(),
    productSpecs: r.many.productEquipmentSpecTable(),
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
    convertions: r.many.productConvertionTable(),
    aliases: r.many.productCodeAliasTable(),
    specs: r.many.productEquipmentSpecTable(),
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
  productConvertionTable: {
    product: r.one.productTable({
      from: r.productConvertionTable.productId,
      to: r.productTable.id,
    }),
    uom: r.one.unitTable({
      from: r.productConvertionTable.uomId,
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
  productEquipmentSpecTable: {
    product: r.one.productTable({
      from: r.productEquipmentSpecTable.productId,
      to: r.productTable.id,
    }),
    equipment: r.one.equipmentTable({
      from: r.productEquipmentSpecTable.equipmentId,
      to: r.equipmentTable.id,
    }),
    unit: r.one.unitTable({
      from: r.productEquipmentSpecTable.uomId,
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
