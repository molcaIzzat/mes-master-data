import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createPost, getMe, listPosts } from "./api.js";

const PAGE_SIZE = 10;

const meKey = ["me"] as const;
const postsKey = ["posts"] as const;

function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

function usePosts() {
  return useInfiniteQuery({
    queryKey: postsKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listPosts(pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.last ? undefined : meta.page + 1;
    },
  });
}

function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Refetch the feed so the new post shows with server-assigned fields.
      void queryClient.invalidateQueries({ queryKey: postsKey });
    },
  });
}

export { useMe, usePosts, useCreatePost, meKey, postsKey, PAGE_SIZE };
