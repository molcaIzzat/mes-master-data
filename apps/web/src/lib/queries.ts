import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createProduct,
  deleteProduct,
  getAreas,
  getMe,
  getProductById,
  getProducts,
  getUoms,
  getWorkCenters,
  updateProduct,
} from "./api.js";

import type { ProductQuery } from "./api.js";

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
  useCreateProduct,
  useDeleteProduct,
  useMe,
  useProduct,
  useProducts,
  useUpdateProduct,
  useUoms,
  useWorkCenters,
  meQueryOptions,
  meKey,
};
