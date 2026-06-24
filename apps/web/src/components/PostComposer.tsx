import { useState } from "react";

import { useCreatePost } from "../lib/queries.js";

function PostComposer() {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const createPost = useCreatePost();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createPost.isPending) return;
    setValidationError(null);

    if (content.trim().length === 0) {
      setValidationError("Content is required.");
      return;
    }
    try {
      new URL(mediaUrl);
    } catch {
      setValidationError("Image URL must be a valid URL.");
      return;
    }

    createPost.mutate(
      { content: content.trim(), mediaUrl },
      {
        onSuccess: () => {
          setContent("");
          setMediaUrl("");
        },
      },
    );
  };

  const error =
    validationError ??
    (createPost.isError
      ? ((createPost.error instanceof Error ? createPost.error.message : null) ??
        "Failed to submit post.")
      : null);

  const fieldClass =
    "w-full rounded-md border-[1.5px] border-black bg-white px-3 py-2.5 text-base focus:outline-2 focus:outline-sky-400";

  return (
    <form className="flex flex-col gap-2.5" onSubmit={submit}>
      <input
        className={fieldClass}
        type="text"
        placeholder="Your content here"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={createPost.isPending}
      />
      <input
        className={fieldClass}
        type="url"
        placeholder="Your Image Url"
        value={mediaUrl}
        onChange={(e) => setMediaUrl(e.target.value)}
        disabled={createPost.isPending}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={createPost.isPending}
          className="rounded-md border border-black bg-sky-400 px-5 py-2 font-bold text-black hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createPost.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

export { PostComposer };
