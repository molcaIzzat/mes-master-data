import { login } from "../lib/api.js";

function Welcome({ notice }: { notice?: string }) {
  return (
    <section className="mt-10 flex flex-col items-center gap-3 rounded-lg border-2 border-black bg-white px-6 py-16 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">Welcome to My Post</h1>
      <p className="font-semibold text-neutral-700">Before you start. Please login.</p>
      {notice ? <p className="text-sm text-red-600">{notice}</p> : null}
      <button
        type="button"
        onClick={() => login("/")}
        className="mt-2 rounded-md border border-black bg-sky-400 px-6 py-2 font-bold text-black hover:bg-sky-500"
      >
        Sign In
      </button>
    </section>
  );
}

export { Welcome };
