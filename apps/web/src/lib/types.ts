// Shapes mirrored from the BFF / core-api responses.

type Me = {
  sub: string;
  preferredUsername: string;
  email: string;
};

// core-api PostList: Omit<Post, "updatedAt" | "region">
type Post = {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  name: string | null;
  userId: string;
  createdAt: string;
};

type PageMeta = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

// core-api WebResponse envelope.
type WebResponse<T> = {
  data: T | null;
  meta?: PageMeta;
  error: string | null;
};

type CreatePostInput = {
  content: string;
  mediaUrl: string;
};

export type { Me, Post, PageMeta, WebResponse, CreatePostInput };
