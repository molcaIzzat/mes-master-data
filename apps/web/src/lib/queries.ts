import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createDowntimeReason,
  createProduct,
  createRejectReworkReason,
  deleteDowntimeReason,
  deleteProduct,
  deleteRejectReworkReason,
  getAreas,
  getDowntimeReasons,
  getEquipments,
  getMe,
  getProductById,
  getProducts,
  getRejectReworkReasons,
  getUoms,
  getWorkCenters,
  updateDowntimeReason,
  updateProduct,
  updateRejectReworkReason,
} from "./api.js";

import type { DowntimeReasonQuery, ProductQuery, RejectReworkReasonQuery } from "./api.js";

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

const equipmentsKey = ["equipments"] as const;

function useEquipments() {
  return useQuery({
    queryKey: equipmentsKey,
    queryFn: getEquipments,
    staleTime: 5 * 60 * 1000,
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
  useCreateProduct,
  useCreateRejectReworkReason,
  useDeleteDowntimeReason,
  useDeleteProduct,
  useDeleteRejectReworkReason,
  useDowntimeReasons,
  useEquipments,
  useMe,
  useUpdateDowntimeReason,
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
