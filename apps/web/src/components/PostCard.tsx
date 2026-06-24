import { useState } from "react";

import type { Post } from "../lib/types.js";

function PostCard({ post }: { post: Post }) {
  const [imageOk, setImageOk] = useState(true);
  const author = post.name?.trim() || post.userId;

  return (
    <article className="flex flex-col gap-3 rounded-lg border-2 border-black bg-white p-5">
      <header className="font-bold">{author}</header>
      {post.mediaUrl && imageOk ? (
        <img
          src={post.mediaUrl}
          alt=""
          loading="lazy"
          onError={() => setImageOk(false)}
          className="max-h-[420px] w-full rounded-md bg-neutral-100 object-cover"
        />
      ) : null}
      {post.content ? <p className="whitespace-pre-wrap break-words">{post.content}</p> : null}
    </article>
  );
}

export { PostCard };
