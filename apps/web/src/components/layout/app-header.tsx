import { useMatches } from "@tanstack/react-router";

import { UserMenu } from "@/components/layout/user-menu.js";

// Pulls the page title/description from the deepest matched route's staticData
// (declared in router.tsx), so the header follows the current path.
function useRouteMeta() {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const data = matches[i]?.staticData;
    if (data?.title) return data;
  }
  return undefined;
}

function AppHeader() {
  const meta = useRouteMeta();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold leading-tight">{meta?.title ?? ""}</h1>
        {meta?.description ? (
          <p className="truncate text-sm text-muted-foreground">{meta.description}</p>
        ) : null}
      </div>
      <UserMenu />
    </header>
  );
}

export { AppHeader };
