import { isAxiosError } from "axios";

import { http } from "./http.js";

import type {
  AreaListItem,
  CreateProductInput,
  Me,
  PageMeta,
  ProductListItem,
  UomListItem,
  WebResponse,
  WorkCenterListItem,
} from "./types.js";

// Returns the current user, or null when not authenticated.
async function getMe(): Promise<Me | null> {
  try {
    const { data } = await http.get<WebResponse<Me>>("/api/me", { authProbe: true });
    return data.data;
  } catch (err) {
    if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
      return null;
    }
    throw err;
  }
}

// Full-page navigations: the BFF responds with redirects (to the IdP / back to
// the app), so these must not go through axios.
function login(returnTo = "/"): void {
  globalThis.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function logout(): void {
  globalThis.location.href = "/api/logout";
}

// Core-api requests go through the BFF proxy (mounted at /api/proxy), which
// injects the Bearer token from the httpOnly session cookie.
type ProductQuery = {
  page: number;
  size: number;
  q?: string;
  areaId?: number;
};

type ProductPage = {
  items: ProductListItem[];
  meta: PageMeta | undefined;
};

// Returns a page of products (SKUs). `q` filters by name/code, `areaId` filters
// by area; both are omitted from the request when unset.
async function getProducts({ page, size, q, areaId }: ProductQuery): Promise<ProductPage> {
  const params: Record<string, number | string> = { page, size };
  if (q) params.q = q;
  if (areaId) params.areaId = areaId;

  const { data } = await http.get<WebResponse<ProductListItem[]>>("/api/proxy/v1/products", {
    params,
  });
  return { items: data.data ?? [], meta: data.meta };
}

// Returns areas for the "Select Area" filter (single page, capped at the API max).
async function getAreas(): Promise<AreaListItem[]> {
  const { data } = await http.get<WebResponse<AreaListItem[]>>("/api/proxy/v1/areas", {
    params: { page: 1, size: 100 },
  });
  return data.data ?? [];
}

// Returns units of measure for the Packaging and Unit Cycle Time selects.
async function getUoms(): Promise<UomListItem[]> {
  const { data } = await http.get<WebResponse<UomListItem[]>>("/api/proxy/v1/uoms", {
    params: { page: 1, size: 100 },
  });
  return data.data ?? [];
}

// Returns work centers (lines) for the "Line" multi-select, optionally scoped to
// an area.
async function getWorkCenters(areaId?: number): Promise<WorkCenterListItem[]> {
  const params: Record<string, number> = { page: 1, size: 100 };
  if (areaId) params.areaId = areaId;

  const { data } = await http.get<WebResponse<WorkCenterListItem[]>>("/api/proxy/v1/work-centers", {
    params,
  });
  return data.data ?? [];
}

// Creates a product (SKU). Returns the new id.
async function createProduct(body: CreateProductInput): Promise<{ id: number }> {
  const { data } = await http.post<WebResponse<{ id: number }>>("/api/proxy/v1/products", body);
  return data.data ?? { id: 0 };
}

export { createProduct, getAreas, getMe, getProducts, getUoms, getWorkCenters, login, logout };
export type { ProductQuery };
