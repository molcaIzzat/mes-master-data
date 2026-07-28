import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";

import { onSessionExpired } from "@/lib/http.js";
import { meKey } from "@/lib/queries.js";
import { RequireAuth } from "@/components/require-auth.js";
import { AppSidebar } from "@/components/layout/app-sidebar.js";
import { AppHeader } from "@/components/layout/app-header.js";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.js";
import { RootRedirect } from "@/routes/root-redirect.js";
import { LevelConfiguration } from "@/routes/level-configuration.js";
import { LineDetail } from "@/routes/line-detail.js";
import { DagEditor } from "@/routes/dag-editor.js";
import { MachineDetail } from "@/routes/machine-detail.js";
import { Sku } from "@/routes/sku.js";
import { SkuAdd } from "@/routes/sku-add.js";
import { SkuEdit } from "@/routes/sku-edit.js";
import { DowntimeReason } from "@/routes/downtime-reason.js";
import { RejectReworkReason } from "@/routes/reject-rework-reason.js";
import { Analytics } from "@/routes/analytics.js";

// Per-route page metadata surfaced in the header (title/description follow path).
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    title?: string;
    description?: string;
  }
}

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

// Authenticated app shell: gates everything behind RequireAuth, then renders the
// sidebar + header chrome around the active page.
function AppLayout() {
  return (
    <RequireAuth>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  );
}

// The DAG editor brings its own top bar and needs the whole viewport for its
// canvas, so it is gated the same way but skips the sidebar/header chrome.
function EditorLayout() {
  return (
    <RequireAuth>
      <div className="flex h-svh flex-col overflow-hidden">
        <Outlet />
      </div>
    </RequireAuth>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: RootRedirect,
});

// Pathless layout route holding the shell; page routes hang off it.
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
});

const levelConfigurationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/level-configuration",
  component: LevelConfiguration,
  staticData: { title: "Level Configuration", description: "Level Configuration" },
});

const lineDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/level-configuration/line/$id",
  component: LineDetail,
  staticData: { title: "Detail Line", description: "Level Configuration > Detail Line" },
});

// Pathless layout route for the full-bleed editor, beside the app shell.
const editorLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "editor",
  component: EditorLayout,
});

const dagEditorRoute = createRoute({
  getParentRoute: () => editorLayoutRoute,
  path: "/level-configuration/line/$id/dag-editor",
  component: DagEditor,
  staticData: {
    title: "DAG Editor",
    description: "Level Configuration > Detail Line > DAG Editor",
  },
});

const machineDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/level-configuration/machine/$id",
  component: MachineDetail,
  staticData: { title: "Detail Machine", description: "Level Configuration > Detail Machine" },
});

const skuRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/sku",
  component: Sku,
  staticData: { title: "SKU", description: "SKU" },
});

const skuAddRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/sku/add",
  component: SkuAdd,
  staticData: { title: "Add", description: "SKU > Add" },
});

const skuEditRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/sku/$id/edit",
  component: SkuEdit,
  staticData: { title: "Edit", description: "SKU > Edit" },
});

const downtimeReasonRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/downtime-reason",
  component: DowntimeReason,
  staticData: { title: "Downtime Reason", description: "Downtime Reason" },
});

const rejectReworkReasonRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/reject-rework-reason",
  component: RejectReworkReason,
  staticData: { title: "Reject & Rework Reason", description: "Reject & Rework Reason" },
});

const analyticsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/analytics",
  component: Analytics,
  staticData: { title: "Analytics", description: "Analytics" },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  appLayoutRoute.addChildren([
    levelConfigurationRoute,
    lineDetailRoute,
    machineDetailRoute,
    skuRoute,
    skuAddRoute,
    skuEditRoute,
    downtimeReasonRoute,
    rejectReworkReasonRoute,
    analyticsRoute,
  ]),
  editorLayoutRoute.addChildren([dagEditorRoute]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { router };
