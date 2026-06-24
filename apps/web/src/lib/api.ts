import { isAxiosError } from "axios";

import { http } from "./http.js";

import type { CreatePostInput, Me, Post, WebResponse } from "./types.js";

// core-api posts live behind the BFF proxy at /api/v1/posts.
const POSTS_PATH = "/api/proxy/api/v1/posts";

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

async function listPosts(page: number, size: number): Promise<WebResponse<Post[]>> {
  const { data } = await http.get<WebResponse<Post[]>>(POSTS_PATH, { params: { page, size } });
  return data;
}

async function createPost(input: CreatePostInput): Promise<Post> {
  const { data } = await http.post<WebResponse<Post>>(POSTS_PATH, input);
  if (!data.data) throw new Error(data.error ?? "failed to create post");
  return data.data;
}

// Full-page navigations: the BFF responds with redirects (to the IdP / back to
// the app), so these must not go through axios.
function login(returnTo = "/"): void {
  globalThis.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function logout(): void {
  globalThis.location.href = "/api/logout";
}

export { getMe, listPosts, createPost, login, logout };
