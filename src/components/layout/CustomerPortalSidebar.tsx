
import React from "react";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Users } from
"lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { useSidebarContext } from "@/context/SidebarContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const staffNavigationItems = [
{
  title: "My Tickets",
  to: "/customer-portal/my-tickets",
  icon: Ticket,
  description: "View and manage tickets"
},
{
  title: "Submit Ticket",
  to: "/customer-portal/submit-ticket",
  icon: PlusCircle,
  description: "Create a new support request"
},
{
  title: "Settings",
  to: "/customer-portal/settings",
  icon: Settings,
  description: "Manage your profile"
}];

const adminOnlyNavigationItems = [
{
  title: "Dashboard",
  to: "/customer-portal/dashboard",
  icon: LayoutDashboard,
  description: "Overview of your services"
},
{
  title: "Team",
  to: "/customer-portal/team",
  icon: Users,
  description: "Manage your team members"
}];


const SidebarContent = ({ isCollapsed, onToggleCollapse }: {isCollapsed: boolean;onToggleCollapse?: () => void;}) => {
  const { user, signOut } = useCustomerAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const navigationItems = isAdmin
    ? [...adminOnlyNavigationItems, ...staffNavigationItems]
    : staffNavigationItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/customer-portal/auth');
  };

  return (
    <>
            <div className={cn("p-4 transition-all duration-300", isCollapsed ? 'px-2' : '')}>
                {!isCollapsed ?
        <div className="flex items-center gap-3">
                        <div className="overflow-hidden">
                            



            
                            <img
              src="https://comansservices.com.au/images/comansservices-logo-w.svg"
              alt="Comans Services"
              className="h-9 w-auto dark:hidden block"
              style={{ filter: 'brightness(0) saturate(100%) invert(18%) sepia(97%) saturate(2600%) hue-rotate(352deg) brightness(95%) contrast(97%)' }} />
            
                        </div>
                    </div> :

        <div className="text-center">
                        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center mx-auto overflow-hidden">
                            <img
              src="https://comansservices.com.au/images/comansservices-logo-w.svg"
              alt="Comans"
              className="w-6 h-6 object-contain" />
            
                        </div>
                    </div>
        }

                {onToggleCollapse &&
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mt-2 w-full hidden lg:flex items-center justify-center">
          
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
        }
            </div>

            <Separator className="my-2" />

            <div className="flex flex-col space-y-1 p-2 flex-1 overflow-y-auto">
                {navigationItems.map((item) =>
        <SidebarNavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.title}
          description={item.description} />

        )}
            </div>

            <div className="border-t bg-muted/20 p-2">
                <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950",
            isCollapsed ? 'px-2 justify-center' : ''
          )}
          onClick={handleSignOut}
          title={isCollapsed ? "Sign Out" : undefined}>
          
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="ml-2">Sign Out</span>}
                </Button>
            </div>
        </>);

};

export function CustomerPortalSidebar() {
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
            </Sheet>);

  }

  return (
    <div className={cn(
      "hidden md:flex flex-col",
      isCollapsed ? 'w-16' : 'w-64',
      "border-r border-border h-full bg-background/80 backdrop-blur-md",
      "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
      "shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"
    )}>
            <SidebarContent isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        </div>);

}