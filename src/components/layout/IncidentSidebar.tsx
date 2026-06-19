import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roles";
import {
  Home, AlertTriangle, FolderOpen, Settings, BarChart3,
  Target, Menu, Briefcase, Package, Building2, LayoutTemplate,
  ChevronLeft, ChevronRight, LayoutGrid, Download, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { useSidebarContext } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigationItems = [
  { title: "Dashboard", url: "/incident-management", icon: Home, description: "My assigned incidents" },
  { title: "Active Incidents", url: "/incident-management/incidents", icon: AlertTriangle, description: "All incidents" },
  { title: "Active Jobs", url: "/incident-management/active-jobs", icon: Briefcase, description: "Current workload" },
  { title: "Projects", url: "/incident-management/projects", icon: FolderOpen, description: "My projects" },
  { title: "Assets", url: "/incident-management/assets", icon: Package, description: "Asset management" },
  { title: "Portal Settings", url: "/incident-management/portal-settings", icon: LayoutTemplate, description: "Manage customer portal" },
  { title: "Customer Accounts", url: "/incident-management/customers", icon: Building2, description: "Manage customer user accounts" },
];

const managerItems = [
  { title: "SLA Management", url: "/incident-management/sla", icon: Shield, description: "Service level agreements" },
];

const adminItems = [
  { title: "Analytics", url: "/incident-management/analytics", icon: BarChart3, description: "Reports & insights" },
  { title: "Export", url: "/incident-management/export", icon: Download, description: "Export incidents" },
  { title: "Administration", url: "/incident-management/admin", icon: Settings, description: "System configuration" },
];

const SidebarContent = ({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
}) => {
  const { user, userRole } = useAuth();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const isUserManager = userRole === "manager" || userRole === "admin" || userRole === "sale_manager";

  useEffect(() => {
    const checkRoles = async () => {
      if (user) {
        const adminStatus = await isAdmin(user);
        setIsUserAdmin(adminStatus);
      }
    };
    checkRoles();
  }, [user]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn("flex items-center gap-3 p-4 pb-3", isCollapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Target className="h-4 w-4 text-primary" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">Incident Hub</p>
            <p className="text-xs text-muted-foreground">Management Center</p>
          </div>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn("hidden lg:flex h-7 w-7 p-0 shrink-0", !isCollapsed && "ml-auto")}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>

      <Separator />

      {/* Back to Hub */}
      <div className="p-2">
        <SidebarNavItem
          to="/"
          icon={LayoutGrid}
          label="Back to Hub"
          isHub={true}
          description="Return to main menu"
        />
      </div>

      <Separator />

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {!isCollapsed && (
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Menu
          </p>
        )}
        {navigationItems.map(item => (
          <SidebarNavItem
            key={item.url}
            to={item.url}
            icon={item.icon}
            label={item.title}
            description={item.description}
          />
        ))}

        {isUserManager && (
          <>
            <div className="pt-2 pb-0.5">
              <Separator />
            </div>
            {!isCollapsed && (
              <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Manager
              </p>
            )}
            {managerItems.map(item => (
              <SidebarNavItem
                key={item.url}
                to={item.url}
                icon={item.icon}
                label={item.title}
                description={item.description}
              />
            ))}
          </>
        )}

        {isUserAdmin && (
          <>
            <div className="pt-2 pb-0.5">
              <Separator />
            </div>
            {!isCollapsed && (
              <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Admin
              </p>
            )}
            {adminItems.map(item => (
              <SidebarNavItem
                key={item.url}
                to={item.url}
                icon={item.icon}
                label={item.title}
                description={item.description}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export function IncidentSidebar() {
  const isMobile = useIsMobile();
  const { isCollapsed, toggleCollapse } = useSidebarContext();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent isCollapsed={false} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "hidden md:flex flex-col shrink-0 h-full",
        isCollapsed ? "w-16" : "w-64",
        "border-r border-border bg-background/80 backdrop-blur-md",
        "transition-all duration-300 ease-in-out",
        "shadow-[2px_0_12px_-6px_rgba(0,0,0,0.08)]"
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
    </div>
  );
}
