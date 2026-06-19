import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, Home, LogOut, ChevronLeft, Sun, Moon, Monitor } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useTheme } from "next-themes";

export function MobileHeader() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);

  // Check if we're in a sub-app (not on the main hub)
  const isInSubApp = location.pathname !== "/" && !location.pathname.startsWith("/auth");

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    // Timesheet routes
    if (path.startsWith("/timesheet/reports")) return "Reports";
    if (path.startsWith("/timesheet/team")) return "Team";
    if (path.startsWith("/timesheet/settings")) return "Settings";
    if (path.startsWith("/timesheet/schedule")) return "Schedule";
    if (path.startsWith("/timesheet/holidays")) return "Holidays";
    if (path.startsWith("/timesheet/payroll")) return "Payroll";
    if (path.startsWith("/timesheet")) return "Timesheet";
    // CRM routes
    if (path.startsWith("/crm/accounts")) return "Accounts";
    if (path.startsWith("/crm/contacts")) return "Contacts";
    if (path.startsWith("/crm/deals")) return "Deals";
    if (path.startsWith("/crm/tasks")) return "Tasks";
    if (path.startsWith("/crm")) return "CRM";
    // Assets routes
    if (path.startsWith("/assets")) return "Assets";
    // Incidents routes
    if (path.startsWith("/incidents")) return "Incidents";
    // Default
    return "TimeTracker";
  };

  useEffect(() => {
    if (user?.id) {
      // Get preferred name from localStorage
      const preferredName = localStorage.getItem(`preferred-name-${user.id}`);

      // Set display name with fallback hierarchy
      if (preferredName) {
        setDisplayName(preferredName);
      } else if (user.user_metadata?.full_name) {
        setDisplayName(user.user_metadata.full_name);
      } else {
        setDisplayName(user.email || "User");
      }
    }
  }, [user]);

  // Track scroll for blur effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBackClick = () => {
    haptics.light();
    navigate("/");
  };

  const handleSignOut = () => {
    haptics.medium();
    signOut();
    navigate("/auth");
  };

  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 md:hidden",
        "bg-background border-b border-border",
        "transition-all duration-200",
        isScrolled && "shadow-sm backdrop-blur-sm bg-background/95"
      )}
    >
      <div className="px-4 py-3 flex justify-between items-center h-14">
        {/* Left side - Back button or Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isInSubApp ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="gap-2 px-2"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back to Hub</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          )}

          {/* Page title */}
          <h1 className="text-lg font-semibold text-foreground truncate">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right side - User menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 gap-2"
              onClick={() => haptics.light()}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-6 mt-6">
              {/* User info */}
              <div className="flex flex-col gap-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-medium text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {/* Theme selection */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Theme</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex-1 gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex-1 gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex-1 gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    Auto
                  </Button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-col gap-2">
                {isInSubApp && (
                  <Button
                    variant="outline"
                    onClick={handleBackClick}
                    className="justify-start gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Back to Hub
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
