import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";

import { onSessionExpired } from "@/lib/http.js";
import { meKey } from "@/lib/queries.js";
import { RequireAuth } from "@/components/require-auth.js";
import { RootRedirect } from "@/routes/root-redirect.js";
import { LevelConfiguration } from "@/routes/level-configuration.js";

// Root layout: bridges the non-React session-expiry signal into the query
// cache. Clearing `me` flips the guards back to the unauthenticated branch,
// which re-triggers the Keycloak login.
function RootLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onSessionExpired(() => {
      queryClient.setQueryData(meKey, null);
    });
  }, [queryClient]);

  return <Outlet />;
}

function ProtectedLevelConfiguration() {
  return (
    <RequireAuth>
      <LevelConfiguration />
    </RequireAuth>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: RootRedirect,
});

const levelConfigurationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/level-configuration",
  component: ProtectedLevelConfiguration,
});

const routeTree = rootRoute.addChildren([indexRoute, levelConfigurationRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { router };
