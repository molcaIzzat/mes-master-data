import { useEffect } from "react";

import { login } from "@/lib/api.js";
import { useMe } from "@/lib/queries.js";
import { FullPageLoader } from "@/components/full-page-loader.js";

import type { ReactNode } from "react";

// Single guard enforcing "all pages are protected": renders children only for
// an authenticated user, otherwise sends the browser to the Keycloak login.
function RequireAuth({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();

  useEffect(() => {
    // Settled and unauthenticated -> full-page redirect to the IdP.
    if (!isPending && !me) login();
  }, [isPending, me]);

  // Covers both the pending probe and the brief moment before the redirect.
  if (!me) return <FullPageLoader />;

  return <>{children}</>;
}

export { RequireAuth };
