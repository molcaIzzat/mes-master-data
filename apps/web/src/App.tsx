import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { onSessionExpired } from "./lib/http.js";
import { useMe, meKey, postsKey } from "./lib/queries.js";
import { Feed } from "./components/Feed.js";
import { Welcome } from "./components/Welcome.js";

function App() {
  const queryClient = useQueryClient();
  const { data: me, isPending, isError } = useMe();
  const [notice, setNotice] = useState<string | undefined>(undefined);

  useEffect(() => {
    return onSessionExpired(() => {
      setNotice("Your session expired. Please sign in again.");
      queryClient.setQueryData(meKey, null);
      queryClient.removeQueries({ queryKey: postsKey });
    });
  }, [queryClient]);

  let content;
  if (isPending) {
    content = <p className="py-10 text-center text-neutral-500">Loading…</p>;
  } else if (me) {
    content = <Feed me={me} />;
  } else {
    content = <Welcome notice={notice ?? (isError ? "Could not reach the server." : undefined)} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 pb-20">{content}</main>
  );
}

export default App;
