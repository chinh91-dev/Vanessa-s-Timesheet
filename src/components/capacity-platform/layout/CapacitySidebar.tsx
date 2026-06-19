// ============================================================================
// CapacitySidebar — left-side navigation for the Capacity Platform app
// ----------------------------------------------------------------------------
// Mirrors CRMSidebar: header tile + collapsible desktop sidebar with the
// shared SidebarNavItem component. Mobile is hidden in favour of the
// global BottomNav (matching CRMSidebar behaviour). Customer role never
// reaches here because CapacityAppLayout redirects them out.
// ============================================================================

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Users,
  Sparkles,
  CalendarRange,
  Inbox,
  TrendingUp,
  BarChart3,
  Settings,
  LayoutGrid,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { useSidebarContext } from "@/context/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navigationItems = [
  { to: "/", icon: LayoutGrid, label: "Back to Hub", isHub: true },
  { to: "/capacity-platform", icon: Gauge, label: "Dashboard", end: true },
  { to: "/capacity-platform/people", icon: Users, label: "People" },
  { to: "/capacity-platform/skills", icon: Sparkles, label: "Skills" },
  {
    to: "/capacity-platform/allocation",
    icon: CalendarRange,
    label: "Allocation",
  },
  { to: "/capacity-platform/intake", icon: Inbox, label: "Work Intake" },
  { to: "/capacity-platform/forecast", icon: TrendingUp, label: "Forecast" },
  { to: "/capacity-platform/reports", icon: BarChart3, label: "Reports" },
  { to: "/capacity-platform/settings", icon: Settings, label: "Settings" },
] as const;

interface SidebarContentProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SidebarContent = ({
  isCollapsed = false,
  onToggleCollapse,
}: SidebarContentProps) => (
  <>
    <div
      className={`p-4 ${isCollapsed ? "px-2" : ""} transition-all duration-300`}
    >
      {!isCollapsed ? (
        <>
          <h2 className="text-xl font-semibold text-foreground">
            Capacity Platform
          </h2>
          <p className="text-sm text-muted-foreground">
            Resource &amp; capacity planning
          </p>
        </>
      ) : (
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm">
            CP
          </div>
        </div>
      )}

      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mt-2 w-full hidden lg:flex items-center justify-center"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>

    <Separator className="my-2" />

    <div className="flex flex-col space-y-1 p-2">
      {navigationItems.map((item) => (
        <SidebarNavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          isHub={"isHub" in item ? item.isHub : false}
          end={"end" in item ? item.end : false}
        />
      ))}
    </div>
  </>
);

const CapacitySidebar = () => {
  const isMobile = useIsMobile();
  const { isCollapsed, toggleCollapse } = useSidebarContext();

  if (isMobile) {
    // Hidden on mobile in favour of the global BottomNav; mirrors CRMSidebar.
    return null;
  }

  return (
    <div
      className={cn(
        "hidden md:block",
        isCollapsed ? "w-14" : "w-56 lg:w-60 xl:w-64",
        "border-r border-border h-full bg-background/80 backdrop-blur-md",
        "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
        "shrink-0 overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"
      )}
    >
      <SidebarContent
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
    </div>
  );
};

export default CapacitySidebar;
// Re-export Sheet bits to satisfy the same external surface as CRMSidebar
// for any future mobile-drawer parity (not used today).
export { Sheet, SheetContent, SheetTrigger };
