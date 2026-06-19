import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import SuiteSwitcher from "@/components/crm/layout/SuiteSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDevice } from "@/context/DeviceContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  children?: React.ReactNode;
  className?: string;
  showTitle?: boolean;
}

const Header: React.FC<HeaderProps> = ({ children, className, showTitle = true }) => {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useDevice();

  const displayName = user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className={cn(
      "glass border-b-0 sticky top-0 z-50",
      "transition-all duration-200",
      isMobile ? "h-14" : "h-auto",
      className
    )}>
      <div className={cn(
        "w-full flex justify-between items-center gap-3",
        isMobile ? "px-3 py-2 h-full" : "px-3 sm:px-4 md:px-6 py-2.5 sm:py-3"
      )}>
        {/* Left: Logo & Suite Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          {showTitle && (
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate hidden sm:block">
              Comans Management Hub
            </h1>
          )}
          <SuiteSwitcher />
        </div>

        {/* Center: Dynamic Content (e.g. Search) */}
        {children && (
          <div className="flex-1 px-4 hidden md:block">
            {children}
          </div>
        )}

        {/* Right: Theme Toggle & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
                    Role: {userRole || 'employee'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/timesheet/settings')}>
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/')}>
                Back to Hub
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
