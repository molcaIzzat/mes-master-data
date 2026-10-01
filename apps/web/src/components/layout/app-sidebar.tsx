import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Folder,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

import { cn } from "@/lib/utils.js";
import { MolcaLogo } from "@/components/molca-logo.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar.js";

import type { LucideIcon } from "lucide-react";

// Single source for the nav; add a route here + register it in router.tsx.
type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Level Configuration", to: "/level-configuration", icon: SlidersHorizontal },
  { label: "SKU", to: "/sku", icon: Folder },
  { label: "Downtime Reason", to: "/downtime-reason", icon: AlertCircle },
  // Directly under Downtime Reason: the two are read together — a stop cites a
  // reason and an action — and the OEE monitor's edit dialog offers both pickers
  // side by side.
  { label: "Downtime Action", to: "/downtime-action", icon: Wrench },
  { label: "Reject & Rework Reason", to: "/reject-rework-reason", icon: X },
];

// The Master Data module switcher. Items link elsewhere (e.g. the portal);
// targets are placeholders until the real URLs are wired.
function ModuleSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2",
          "bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium",
          "outline-none transition-colors hover:bg-sidebar-primary/90",
          "focus-visible:ring-sidebar-ring focus-visible:ring-2",
        )}
      >
        <span className="truncate">Master Data</span>
        <ChevronDown className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuItem asChild>
          <a href="#">
            <ExternalLink />
            Portal
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://oee.mes.efortech.id">
            <ExternalLink />
            OEE Monitoring
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://sm.mes.efortech.id">
            <ExternalLink />
            Schedule Maintenance
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://js.mes.efortech.id">
            <ExternalLink />
            Job Schedule
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center justify-between">
          <MolcaLogo className="group-data-[collapsible=icon]:hidden" />
          <SidebarTrigger />
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <ModuleSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.to);
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export { AppSidebar };
