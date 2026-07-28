import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createCountPoint,
  createDowntimeReason,
  createEdge,
  createEquipment,
  createProduct,
  createProductAlias,
  createProductSpec,
  createRejectReworkReason,
  createWorkCenter,
  createWorkUnit,
  deleteCountPoint,
  deleteDowntimeReason,
  deleteEdge,
  deleteEquipment,
  deleteProduct,
  deleteProductAlias,
  deleteProductSpec,
  deleteRejectReworkReason,
  deleteWorkCenter,
  deleteWorkUnit,
  getAreas,
  getCountPoints,
  getDowntimeReasons,
  getEdges,
  getEquipmentClasses,
  getEquipments,
  getEquipmentsPage,
  getLevelConfigurations,
  getMe,
  getProductAliases,
  getProductById,
  getProducts,
  getProductSpecs,
  getRejectReworkReasons,
  getUoms,
  getWorkCenterById,
  getWorkCenterClasses,
  getWorkCenters,
  getWorkUnitById,
  getWorkUnitClasses,
  getWorkUnits,
  importCountPoints,
  updateCountPoint,
  updateDowntimeReason,
  updateEdge,
  updateEquipment,
  updateProduct,
  updateProductAlias,
  updateProductSpec,
  updateRejectReworkReason,
  updateWorkCenter,
  updateWorkUnit,
  updateWorkUnitLayout,
} from "./api.js";

import type {
  DowntimeReasonQuery,
  EquipmentQuery,
  LevelConfigurationQuery,
  MachineChildQuery,
  ProductQuery,
  RejectReworkReasonQuery,
} from "./api.js";
import type { EquipmentListItem, WorkUnitListItem } from "./types.js";

const meKey = ["me"] as const;

// Shared definition so components (useMe) and any future router loader stay in
// sync on the "current user" query.
const meQueryOptions = queryOptions({
  queryKey: meKey,
  queryFn: getMe,
  staleTime: 5 * 60 * 1000,
  retry: false,
});

function useMe() {
  return useQuery(meQueryOptions);
}

const productsKey = (params: ProductQuery) => ["products", params] as const;

// keepPreviousData keeps the current rows visible while the next page/search
// loads, avoiding an empty-table flash.
function useProducts(params: ProductQuery) {
  return useQuery({
    queryKey: productsKey(params),
    queryFn: () => getProducts(params),
    placeholderData: keepPreviousData,
  });
}

const downtimeReasonsKey = (params: DowntimeReasonQuery) => ["downtime-reasons", params] as const;

// keepPreviousData keeps the current rows visible while the next page/search
// loads, avoiding an empty-table flash.
function useDowntimeReasons(params: DowntimeReasonQuery) {
  return useQuery({
    queryKey: downtimeReasonsKey(params),
    queryFn: () => getDowntimeReasons(params),
    placeholderData: keepPreviousData,
  });
}

// Invalidates the list on success so the new reason shows up.
function useCreateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDowntimeReason,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downtime-reasons"] }),
  });
}

// Refreshes the list after an edit.
function useUpdateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDowntimeReason,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downtime-reasons"] }),
  });
}

// Refreshes the list after a delete.
function useDeleteDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDowntimeReason,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["downtime-reasons"] }),
  });
}

const rejectReworkReasonsKey = (params: RejectReworkReasonQuery) =>
  ["reject-rework-reasons", params] as const;

// keepPreviousData keeps the current rows visible while the next page/search
// loads, avoiding an empty-table flash.
function useRejectReworkReasons(params: RejectReworkReasonQuery) {
  return useQuery({
    queryKey: rejectReworkReasonsKey(params),
    queryFn: () => getRejectReworkReasons(params),
    placeholderData: keepPreviousData,
  });
}

// Invalidates the list on success so the new reason shows up.
function useCreateRejectReworkReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRejectReworkReason,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reject-rework-reasons"] }),
  });
}

// Refreshes the list after an edit.
function useUpdateRejectReworkReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRejectReworkReason,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reject-rework-reasons"] }),
  });
}

// Refreshes the list after a delete.
function useDeleteRejectReworkReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRejectReworkReason,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reject-rework-reasons"] }),
  });
}

const levelConfigurationsKey = (params: LevelConfigurationQuery) =>
  ["level-configurations", params] as const;

// One page of lines with their subtree already embedded; keepPreviousData holds
// the current rows while the next page/search loads.
function useLevelConfigurations(params: LevelConfigurationQuery) {
  return useQuery({
    queryKey: levelConfigurationsKey(params),
    queryFn: () => getLevelConfigurations(params),
    placeholderData: keepPreviousData,
  });
}

// Reference data for the level configuration selects; rarely changes.
const workCenterClassesKey = ["work-center-classes"] as const;
const workUnitClassesKey = ["work-unit-classes"] as const;
const equipmentClassesKey = ["equipment-classes"] as const;

function useWorkCenterClasses() {
  return useQuery({
    queryKey: workCenterClassesKey,
    queryFn: getWorkCenterClasses,
    staleTime: 5 * 60 * 1000,
  });
}

function useWorkUnitClasses() {
  return useQuery({
    queryKey: workUnitClassesKey,
    queryFn: getWorkUnitClasses,
    staleTime: 5 * 60 * 1000,
  });
}

function useEquipmentClasses() {
  return useQuery({
    queryKey: equipmentClassesKey,
    queryFn: getEquipmentClasses,
    staleTime: 5 * 60 * 1000,
  });
}

// Every level configuration write invalidates the tree so the affected branch
// reappears with its new contents. Lines also feed the downtime/reject filters,
// so those caches are dropped alongside. Deleting equipment cascades to its
// count points and code aliases, hence those two as well.
function useLevelConfigurationMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["level-configurations"] });
      void queryClient.invalidateQueries({ queryKey: ["work-centers"] });
      void queryClient.invalidateQueries({ queryKey: ["work-unit"] });
      void queryClient.invalidateQueries({ queryKey: ["equipments"] });
      void queryClient.invalidateQueries({ queryKey: ["product-aliases"] });
      void queryClient.invalidateQueries({ queryKey: ["count-points"] });
      // Deleting a machine takes its flows with it, and renaming one changes
      // how the flow table reads.
      void queryClient.invalidateQueries({ queryKey: ["edges"] });
      void queryClient.invalidateQueries({ queryKey: ["work-units"] });
    },
  });
}

const useCreateWorkCenter = () => useLevelConfigurationMutation(createWorkCenter);
const useUpdateWorkCenter = () => useLevelConfigurationMutation(updateWorkCenter);
const useCreateWorkUnit = () => useLevelConfigurationMutation(createWorkUnit);
const useUpdateWorkUnit = () => useLevelConfigurationMutation(updateWorkUnit);
const useCreateEquipment = () => useLevelConfigurationMutation(createEquipment);
const useUpdateEquipment = () => useLevelConfigurationMutation(updateEquipment);
const useDeleteWorkCenter = () => useLevelConfigurationMutation(deleteWorkCenter);
const useDeleteWorkUnit = () => useLevelConfigurationMutation(deleteWorkUnit);
const useDeleteEquipment = () => useLevelConfigurationMutation(deleteEquipment);

// --- machine detail ---------------------------------------------------------

const workUnitKey = (id: number) => ["work-unit", id] as const;

// The machine behind the detail page. Its `workCenter` is the only pointer to
// the parent line, so the line query below waits on this one.
function useWorkUnit(id: number) {
  return useQuery({
    queryKey: workUnitKey(id),
    queryFn: () => getWorkUnitById(id),
    enabled: Number.isFinite(id),
  });
}

const workCenterKey = (id: number | undefined) => ["work-centers", "detail", id ?? null] as const;

// Supplies the area and category of the machine's line; skipped until the work
// unit has resolved.
function useWorkCenter(id: number | undefined) {
  return useQuery({
    queryKey: workCenterKey(id),
    queryFn: () => getWorkCenterById(id as number),
    enabled: id !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

// Shares the "equipments" key prefix with the select feed above so a single
// invalidation refreshes both.
const equipmentsPageKey = (params: EquipmentQuery) => ["equipments", "page", params] as const;

function useEquipmentsPage(params: EquipmentQuery) {
  return useQuery({
    queryKey: equipmentsPageKey(params),
    queryFn: () => getEquipmentsPage(params),
    enabled: Number.isFinite(params.workUnitId),
    placeholderData: keepPreviousData,
  });
}

// Equipment for the machine's own selects, keyed off the work unit rather than
// the line.
const equipmentsByUnitKey = (workUnitId: number) => ["equipments", "unit", workUnitId] as const;

function useEquipmentsByWorkUnit(workUnitId: number) {
  return useQuery({
    queryKey: equipmentsByUnitKey(workUnitId),
    queryFn: () => getEquipmentsPage({ workUnitId, page: 1, size: 100 }).then((r) => r.items),
    enabled: Number.isFinite(workUnitId),
    staleTime: 5 * 60 * 1000,
  });
}

const productSpecsKey = (params: MachineChildQuery) => ["product-specs", params] as const;
const productAliasesKey = (params: MachineChildQuery) => ["product-aliases", params] as const;
const countPointsKey = (params: MachineChildQuery) => ["count-points", params] as const;

function useProductSpecs(params: MachineChildQuery) {
  return useQuery({
    queryKey: productSpecsKey(params),
    queryFn: () => getProductSpecs(params),
    enabled: Number.isFinite(params.workUnitId),
    placeholderData: keepPreviousData,
  });
}

function useProductAliases(params: MachineChildQuery) {
  return useQuery({
    queryKey: productAliasesKey(params),
    queryFn: () => getProductAliases(params),
    enabled: Number.isFinite(params.workUnitId),
    placeholderData: keepPreviousData,
  });
}

function useCountPoints(params: MachineChildQuery) {
  return useQuery({
    queryKey: countPointsKey(params),
    queryFn: () => getCountPoints(params),
    enabled: Number.isFinite(params.workUnitId),
    placeholderData: keepPreviousData,
  });
}

// Each machine child write only touches its own list, so the scope prefix is
// all that has to be dropped.
function useMachineChildMutation<TVars, TData>(
  scope: string,
  mutationFn: (vars: TVars) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [scope] }),
  });
}

const useCreateProductSpec = () => useMachineChildMutation("product-specs", createProductSpec);
const useUpdateProductSpec = () => useMachineChildMutation("product-specs", updateProductSpec);
const useDeleteProductSpec = () => useMachineChildMutation("product-specs", deleteProductSpec);
const useCreateProductAlias = () => useMachineChildMutation("product-aliases", createProductAlias);
const useUpdateProductAlias = () => useMachineChildMutation("product-aliases", updateProductAlias);
const useDeleteProductAlias = () => useMachineChildMutation("product-aliases", deleteProductAlias);
const useCreateCountPoint = () => useMachineChildMutation("count-points", createCountPoint);
const useUpdateCountPoint = () => useMachineChildMutation("count-points", updateCountPoint);
const useDeleteCountPoint = () => useMachineChildMutation("count-points", deleteCountPoint);
// A whole file at once, but it lands in the same list, so it invalidates the
// same way a single create does.
const useImportCountPoints = () => useMachineChildMutation("count-points", importCountPoints);

// --- line detail -------------------------------------------------------------

const workUnitsKey = (workCenterId: number) => ["work-units", workCenterId] as const;

// The machines on one line, behind the From/To selects of the flow dialog.
function useWorkUnitsByWorkCenter(workCenterId: number) {
  return useQuery({
    queryKey: workUnitsKey(workCenterId),
    queryFn: () => getWorkUnits(workCenterId),
    enabled: Number.isFinite(workCenterId),
    staleTime: 5 * 60 * 1000,
  });
}

const edgesKey = (workCenterId: number) => ["edges", workCenterId] as const;

// Every flow on the line in one response -- this endpoint is not paginated.
function useEdges(workCenterId: number) {
  return useQuery({
    queryKey: edgesKey(workCenterId),
    queryFn: () => getEdges(workCenterId),
    enabled: Number.isFinite(workCenterId),
  });
}

function useEdgeMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edges"] }),
  });
}

const useCreateEdge = () => useEdgeMutation(createEdge);
const useUpdateEdge = () => useEdgeMutation(updateEdge);
const useDeleteEdge = () => useEdgeMutation(deleteEdge);

const areasKey = ["areas"] as const;

function useAreas() {
  return useQuery({
    queryKey: areasKey,
    queryFn: getAreas,
    staleTime: 5 * 60 * 1000,
  });
}

const uomsKey = ["uoms"] as const;

function useUoms() {
  return useQuery({
    queryKey: uomsKey,
    queryFn: getUoms,
    staleTime: 5 * 60 * 1000,
  });
}

const equipmentsKey = (workCenterId: number) => ["equipments", workCenterId] as const;

// Fetches equipment for each selected line (work center) and returns the deduped
// union, so the Equipment select shows only equipment on the chosen lines.
function useEquipmentsByWorkCenters(workCenterIds: number[]) {
  return useQueries({
    queries: workCenterIds.map((id) => ({
      queryKey: equipmentsKey(id),
      queryFn: () => getEquipments(id),
      staleTime: 5 * 60 * 1000,
    })),
    combine: (results) => {
      const byId = new Map<number, EquipmentListItem>();
      for (const result of results) {
        for (const equipment of result.data ?? []) byId.set(equipment.id, equipment);
      }
      return {
        data: [...byId.values()],
        isPending: results.some((r) => r.isPending),
      };
    },
  });
}

// --- dag editor --------------------------------------------------------------

// Every piece of equipment on the line in one request. Each item carries its
// `unit`, so the canvas groups equipment per machine node without a query per
// node. Shares its key with `useEquipmentsByWorkCenters`.
function useEquipmentsByLine(workCenterId: number) {
  return useQuery({
    queryKey: equipmentsKey(workCenterId),
    queryFn: () => getEquipments(workCenterId),
    enabled: Number.isFinite(workCenterId),
    staleTime: 5 * 60 * 1000,
  });
}

// How many count points each machine holds, for the chip at the foot of a node.
// There is no line-wide count-point endpoint, so this asks each machine for one
// row and reads the total off the page meta.
function useCountPointTotals(workUnitIds: number[]) {
  return useQueries({
    queries: workUnitIds.map((workUnitId) => {
      const params = { workUnitId, page: 1, size: 1 };
      return {
        queryKey: countPointsKey(params),
        queryFn: () => getCountPoints(params),
      };
    }),
    combine: (results) => {
      const totals = new Map<number, number>();
      results.forEach((result, index) => {
        const workUnitId = workUnitIds[index];
        if (workUnitId === undefined) return;
        totals.set(workUnitId, result.data?.meta?.totalElements ?? 0);
      });
      return {
        data: totals,
        isPending: results.some((r) => r.isPending),
      };
    },
  });
}

// Persists a drag or a resize. Deliberately not a level-configuration mutation:
// that invalidates eight keys, and a refetch mid-gesture makes nodes jump. The
// cached machine list is patched in place instead, and only re-read if the write
// failed.
function useUpdateWorkUnitLayout(workCenterId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkUnitLayout,
    onSuccess: (_result, variables) => {
      queryClient.setQueryData<WorkUnitListItem[]>(workUnitsKey(workCenterId), (current) =>
        current?.map((unit) =>
          unit.id === variables.id ? { ...unit, position: variables.position } : unit,
        ),
      );
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: workUnitsKey(workCenterId) });
    },
  });
}

const workCentersKey = (areaId?: number) => ["work-centers", areaId ?? null] as const;

// Lines are scoped to the selected area; without one, no lines are fetched.
function useWorkCenters(areaId?: number) {
  return useQuery({
    queryKey: workCentersKey(areaId),
    queryFn: () => getWorkCenters(areaId),
    enabled: areaId !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

const productKey = (id: number) => ["product", id] as const;

// Single product for the edit form.
function useProduct(id: number) {
  return useQuery({
    queryKey: productKey(id),
    queryFn: () => getProductById(id),
    enabled: Number.isFinite(id),
  });
}

// Invalidates the products list on success so the new SKU shows up.
function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

// Invalidates the list and the edited product's own cache.
function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: productKey(id) });
    },
  });
}

// Refreshes the list after a delete.
function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export {
  useAreas,
  useCountPoints,
  useCountPointTotals,
  useCreateCountPoint,
  useCreateDowntimeReason,
  useCreateEdge,
  useCreateEquipment,
  useCreateProduct,
  useCreateProductAlias,
  useCreateProductSpec,
  useCreateRejectReworkReason,
  useCreateWorkCenter,
  useCreateWorkUnit,
  useDeleteCountPoint,
  useDeleteDowntimeReason,
  useDeleteEdge,
  useDeleteEquipment,
  useDeleteProduct,
  useDeleteProductAlias,
  useDeleteProductSpec,
  useDeleteRejectReworkReason,
  useDeleteWorkCenter,
  useDeleteWorkUnit,
  useDowntimeReasons,
  useEdges,
  useEquipmentClasses,
  useEquipmentsByLine,
  useEquipmentsByWorkCenters,
  useEquipmentsByWorkUnit,
  useEquipmentsPage,
  useImportCountPoints,
  useLevelConfigurations,
  useMe,
  useProductAliases,
  useProductSpecs,
  useUpdateCountPoint,
  useUpdateDowntimeReason,
  useUpdateEdge,
  useUpdateEquipment,
  useUpdateProductAlias,
  useUpdateProductSpec,
  useUpdateWorkCenter,
  useUpdateWorkUnit,
  useUpdateWorkUnitLayout,
  useWorkCenter,
  useWorkCenterClasses,
  useWorkUnit,
  useWorkUnitClasses,
  useWorkUnitsByWorkCenter,
  useProduct,
  useProducts,
  useRejectReworkReasons,
  useUpdateProduct,
  useUpdateRejectReworkReason,
  useUoms,
  useWorkCenters,
  meQueryOptions,
  meKey,
};
