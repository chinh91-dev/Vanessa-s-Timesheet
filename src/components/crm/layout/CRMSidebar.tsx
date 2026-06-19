import React from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "react-router-dom";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import {
  Kanban,
  Building2,
  Handshake,
  Package,
  UserPlus,
  CheckSquare,
  BarChart3,
  Settings,
  LayoutGrid,
  Archive,
  Calendar,
  Target,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebarContext } from "@/context/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navigationItems = [
  { to: '/', icon: LayoutGrid, label: 'Back to Hub', roles: ['all'], isHub: true },
  { to: '/crm/prospects', icon: Target, label: 'Prospects', roles: ['admin', 'sale_user'] },
  { to: '/crm/pipeline', icon: Kanban, label: 'Pipeline', roles: ['all'] },
  { to: '/crm/contacts', icon: UserPlus, label: 'Contacts', roles: ['all'] },
  { to: '/crm/accounts', icon: Building2, label: 'Accounts', roles: ['admin', 'manager', 'sale_manager', 'sale_user'] },
  { to: '/crm/deals', icon: Handshake, label: 'Deals', roles: ['all'] },
  { to: '/crm/services', icon: Package, label: 'Services', roles: ['admin', 'manager', 'sale_manager'] },
  { to: '/crm/tasks', icon: CheckSquare, label: 'Tasks', roles: ['all'] },
  { to: '/crm/meetings', icon: Calendar, label: 'Meetings', roles: ['all'] },
  { to: '/crm/reports', icon: BarChart3, label: 'Reports', roles: ['admin'] },
  { to: '/crm/archive', icon: Archive, label: 'Archive', roles: ['admin', 'sale_manager', 'sale_user'] },
  { to: '/crm/admin', icon: Settings, label: 'Admin', roles: ['admin'] },
];

const SidebarContent = ({
  isCollapsed = false,
  onToggleCollapse
}: {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const { userRole } = useAuth();
  const location = useLocation();

  // Filter navigation items based on role
  const filteredItems = navigationItems.filter(item => {
    if (item.roles.includes('all')) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <>
      {/* Header */}
      <div className={`p-4 ${isCollapsed ? 'px-2' : ''} transition-all duration-300`}>
        {!isCollapsed ? (
          <>
            <h2 className="text-xl font-semibold text-foreground">Comans CRM</h2>
            <p className="text-sm text-muted-foreground">Sales & Customer Management</p>
          </>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm">
              CR
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
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Separator className="my-2" />

      {/* Navigation items */}
      <div className="flex flex-col space-y-1 p-2">
        {filteredItems.map((item) => (
          <SidebarNavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isHub={item.isHub}
          />
        ))}
      </div>
    </>
  );
};

const CRMSidebar = () => {
  const isMobile = useIsMobile();
  const { isCollapsed, toggleCollapse } = useSidebarContext();

  // Mobile sidebar - Hidden as requested in favor of BottomNav "More" menu
  if (isMobile) {
    return null;
  }

  // Desktop sidebar with proper styling
  return (
    <div className={cn(
      "hidden md:block",
      isCollapsed ? 'w-14' : 'w-56 lg:w-60 xl:w-64',
      "border-r border-border h-full bg-background/80 backdrop-blur-md",
      "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
      "shrink-0 overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"
    )}>
      <SidebarContent
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
    </div>
  );
};

export default CRMSidebar;
