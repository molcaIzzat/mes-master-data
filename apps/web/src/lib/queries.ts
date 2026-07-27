import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createDowntimeReason,
  createEquipment,
  createProduct,
  createRejectReworkReason,
  createWorkCenter,
  createWorkUnit,
  deleteDowntimeReason,
  deleteEquipment,
  deleteProduct,
  deleteRejectReworkReason,
  deleteWorkCenter,
  deleteWorkUnit,
  getAreas,
  getDowntimeReasons,
  getEquipmentClasses,
  getEquipments,
  getLevelConfigurations,
  getMe,
  getProductById,
  getProducts,
  getRejectReworkReasons,
  getUoms,
  getWorkCenterClasses,
  getWorkCenters,
  getWorkUnitClasses,
  updateDowntimeReason,
  updateEquipment,
  updateProduct,
  updateRejectReworkReason,
  updateWorkCenter,
  updateWorkUnit,
} from "./api.js";

import type {
  DowntimeReasonQuery,
  LevelConfigurationQuery,
  ProductQuery,
  RejectReworkReasonQuery,
} from "./api.js";
import type { EquipmentListItem } from "./types.js";

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
// so those caches are dropped alongside.
function useLevelConfigurationMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["level-configurations"] });
      void queryClient.invalidateQueries({ queryKey: ["work-centers"] });
      void queryClient.invalidateQueries({ queryKey: ["equipments"] });
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
  useCreateDowntimeReason,
  useCreateEquipment,
  useCreateProduct,
  useCreateRejectReworkReason,
  useCreateWorkCenter,
  useCreateWorkUnit,
  useDeleteDowntimeReason,
  useDeleteEquipment,
  useDeleteProduct,
  useDeleteRejectReworkReason,
  useDeleteWorkCenter,
  useDeleteWorkUnit,
  useDowntimeReasons,
  useEquipmentClasses,
  useEquipmentsByWorkCenters,
  useLevelConfigurations,
  useMe,
  useUpdateDowntimeReason,
  useUpdateEquipment,
  useUpdateWorkCenter,
  useUpdateWorkUnit,
  useWorkCenterClasses,
  useWorkUnitClasses,
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
