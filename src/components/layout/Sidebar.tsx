
import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Users, Settings, FileText, FolderKanban, BarChart, UserPlus, Clock, CalendarCheck, Plane, Receipt, Archive, MapPin, AlertTriangle, LayoutGrid, Gauge } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebarContext } from "@/context/SidebarContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEmploymentType } from "@/hooks/useEmploymentType";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

const SidebarContent = ({ isCollapsed = false, onToggleCollapse }: {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const { user, userRole, signOut } = useAuth();
  const { isPermanent } = useEmploymentType();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to check if route is active
  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Define which navigation items are available for each role
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";
  const isSalesManager = userRole === "sale_manager";
  const isManagerOrAbove = isAdmin || isManager || isSalesManager;

  const navigationItems = [
    { to: "/", icon: LayoutGrid, label: "Back to Hub", showForAll: true, isHub: true },
    { to: "/timesheet/dashboard", icon: Home, label: "Home", showForAll: true },
    { to: "/timesheet", icon: Calendar, label: "Timesheet", showForAll: true },
    { to: "/timesheet/expenses", icon: Receipt, label: "Expenses", showForAll: true },
    { to: "/timesheet/work-location", icon: MapPin, label: "Work Location", showForAll: true },
    { to: "/timesheet/leave-application", icon: Plane, label: "Leave Application", showForAll: true },
    { to: "/timesheet/ohs", icon: AlertTriangle, label: "OHS", adminOnly: true },
    { to: "/timesheet/contracts", icon: FileText, label: "Contracts", managerOrAbove: true },
    { to: "/timesheet/projects", icon: FolderKanban, label: "Projects", adminOnly: true },
    { to: "/timesheet/customers", icon: Users, label: "Customers", adminOnly: true },
    { to: "/timesheet/reports", icon: BarChart, label: "Reports", adminOnly: true },
    { to: "/timesheet/team", icon: UserPlus, label: "Team", adminOnly: true },
    { to: "/timesheet/work-schedule", icon: Clock, label: "Work Schedule", adminOnly: true },
    { to: "/timesheet/holidays", icon: CalendarCheck, label: "Holiday Management", adminOnly: true },
    { to: "/timesheet/leave-management", icon: CalendarCheck, label: "Leave Management", adminOnly: true },
    { to: "/timesheet/archive", icon: Archive, label: "Archive", adminOnly: true },
  ];

  const filteredItems = navigationItems.filter(item =>
    item.showForAll ||
    (item.managerOrAbove && isManagerOrAbove) ||
    (item.adminOnly && isAdmin)
  );

  return (
    <>
      {/* Header with collapse toggle for desktop */}
      <div className={`p-4 ${isCollapsed ? 'px-2' : ''} transition-all duration-300`}>
        {!isCollapsed ? (
          <>
            <h2 className="text-xl font-semibold">Timesheet App</h2>
            <p className="text-sm text-muted-foreground">Manage your time</p>
          </>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm">
              TA
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
          <Link
            key={item.to}
            to={item.to}
            className={`
              relative flex items-center space-x-2 py-2.5 rounded-lg px-3 group
              ${isCollapsed ? 'justify-center' : ''}
              ${item.isHub
                ? 'bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10'
                : isActiveRoute(item.to)
                  ? 'bg-primary/5 text-primary'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'}
              transition-all duration-200 ease-out
              overflow-hidden
            `}
            title={isCollapsed ? item.label : undefined}
          >
            {/* Permanent active indicator */}
            {!item.isHub && isActiveRoute(item.to) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />
            )}
            {/* Hover indicator for inactive items */}
            {!item.isHub && !isActiveRoute(item.to) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300 group-hover:h-1/2 opacity-0 group-hover:opacity-100" />
            )}

            <item.icon className={`
              h-5 w-5 flex-shrink-0 transition-transform duration-300 
              ${item.isHub ? 'text-primary' : ''}
              ${!item.isHub && isActiveRoute(item.to) ? 'text-primary scale-110' : 'group-hover:scale-110 group-hover:text-primary'}
            `} />

            {!isCollapsed && (
              <span className={`
                font-medium transition-all duration-300
                ${item.isHub || isActiveRoute(item.to) ? 'text-primary' : ''}
              `}>
                {item.label}
              </span>
            )}

            {/* Hover effect background - only for inactive items */}
            {!item.isHub && !isActiveRoute(item.to) && (
              <div className="absolute inset-0 bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            )}
          </Link>
        ))}
      </div>

      {/* Settings and logout */}
      <div className="flex flex-col space-y-1 p-2">
        <Link
          to="/timesheet/settings"
          className={`
            relative flex items-center space-x-2 py-2.5 rounded-lg px-3 group
            ${isCollapsed ? 'justify-center' : ''}
            ${isActiveRoute('/timesheet/settings')
              ? 'bg-primary/5 text-primary'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'}
            transition-all duration-200 ease-out
            overflow-hidden
          `}
          title={isCollapsed ? "Settings" : undefined}
        >
          {/* Permanent active indicator */}
          {isActiveRoute('/timesheet/settings') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />
          )}
          {/* Hover indicator for inactive */}
          {!isActiveRoute('/timesheet/settings') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300 group-hover:h-1/2 opacity-0 group-hover:opacity-100" />
          )}

          <Settings className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${isActiveRoute('/timesheet/settings') ? 'text-primary scale-110' : 'group-hover:scale-110 group-hover:text-primary'}`} />
          {!isCollapsed && <span className={`font-medium transition-all duration-300 ${isActiveRoute('/timesheet/settings') ? 'text-primary' : ''}`}>Settings</span>}

          {/* Hover effect background - only for inactive */}
          {!isActiveRoute('/timesheet/settings') && (
            <div className="absolute inset-0 bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          )}
        </Link>

        <button
          className={`
            relative flex items-center space-x-2 py-2.5 rounded-lg px-3 group w-full text-left
            ${isCollapsed ? 'justify-center' : ''}
            hover:bg-accent text-muted-foreground hover:text-foreground
            transition-all duration-200 ease-out
            overflow-hidden
          `}
          onClick={handleLogout}
          title={isCollapsed ? "Log Out" : undefined}
        >
          <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:text-primary">
            ↗
          </div>
          {!isCollapsed && <span className="font-medium transition-all duration-300">Log Out</span>}

          {/* Hover effect background */}
          <div className="absolute inset-0 bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        </button>
      </div>
    </>
  );
};

const Sidebar = () => {
  const isMobile = useIsMobile();
  const { isCollapsed, toggleCollapse } = useSidebarContext();

  // Mobile sidebar - Hidden as requested in favor of BottomNav "More" menu
  if (isMobile) {
    return null;
  }

  // Desktop sidebar with collapse functionality
  return (
    <div className={`
      ${isCollapsed ? 'w-12' : 'w-full'} 
      h-full transition-all duration-300 ease-in-out
    `}>
      <SidebarContent
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
    </div>
  );
};

export default Sidebar;
