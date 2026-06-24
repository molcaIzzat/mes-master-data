import { useEffect, useRef } from "react";

import { logout } from "../lib/api.js";
import { usePosts } from "../lib/queries.js";
import { PostCard } from "./PostCard.js";
import { PostComposer } from "./PostComposer.js";

import type { Me } from "../lib/types.js";

function Feed({ me }: { me: Me }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
    refetch,
  } = usePosts();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((page) => page.data ?? []) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3.5 rounded-lg border-2 border-black bg-white p-5">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">My Post</h1>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-black bg-sky-400 px-5 py-2 font-bold text-black hover:bg-sky-500"
          >
            Logout
          </button>
        </header>
        <PostComposer />
        <p className="text-xs text-neutral-500">Signed in as {me.preferredUsername || me.sub}</p>
      </section>

      <section className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {posts.length === 0 && !isPending && !isError ? (
          <p className="py-2 text-center text-neutral-500">No posts yet. Be the first to post!</p>
        ) : null}

        {isError ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to load posts."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md border border-black bg-sky-400 px-5 py-2 font-bold text-black hover:bg-sky-500"
            >
              Retry
            </button>
          </div>
        ) : null}

        {isPending || isFetchingNextPage ? (
          <p className="py-2 text-center text-neutral-500">Loading…</p>
        ) : null}

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />

        {!hasNextPage && posts.length > 0 ? (
          <p className="py-2 text-center text-neutral-500">You're all caught up.</p>
        ) : null}
      </section>
    </div>
  );
}

export { Feed };
