import React, { useState } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Zap, Phone, Menu, X } from "lucide-react";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";

const WEBSITE_NAV = [
  { label: "Home",       href: "https://www.comansservices.com.au/" },
  { label: "About",      href: "https://www.comansservices.com.au/about" },
  { label: "Services",   href: "https://www.comansservices.com.au/services" },
  { label: "Projects",   href: "https://www.comansservices.com.au/projects" },
  { label: "Industries", href: "https://www.comansservices.com.au/industries" },
  { label: "Support",    href: "https://www.comansservices.com.au/support" },
];

interface CustomerPortalHeaderProps {
  children?: React.ReactNode;
  className?: string;
  onQuickTicket?: () => void;
}

const CustomerPortalHeader: React.FC<CustomerPortalHeaderProps> = ({ children, className, onQuickTicket }) => {
  const { signOut, user } = useCustomerAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const displayName = user?.full_name || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/customer-portal/auth");
  };

  return (
    <header className={cn("sticky top-0 z-50 shadow-md", className)}>

      {/* ── Top bar: website nav mirroring comansservices.com.au ── */}
      <div className="bg-[#111111] border-b border-white/10">
        <div className="w-full px-4 md:px-6 flex items-center justify-between h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28">

          {/* Logo */}
          <a
            href="https://www.comansservices.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <img
              src="https://comansservices.com.au/images/comansservices-logo-w.svg"
              alt="Comans Services"
              className="h-8 sm:h-10 md:h-12 lg:h-16 xl:h-20 w-auto"
            />
          </a>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
            {WEBSITE_NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 md:px-3 md:py-1.5 lg:px-4 lg:py-2 text-sm md:text-base lg:text-lg xl:text-xl font-medium text-white uppercase tracking-wider hover:text-[#e1251b] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:1300112872"
              className="flex items-center gap-1.5 text-sm md:text-base lg:text-lg text-gray-300 hover:text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5" />
              1300 112 872
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-300 hover:text-white p-1"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/10 px-4 pb-4 pt-2 flex flex-col gap-1">
            {WEBSITE_NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-base font-medium text-white uppercase tracking-wider hover:text-[#e1251b] transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10">
              <a href="tel:1300112872" className="text-base text-gray-300 hover:text-white flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> 1300 112 872
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar: portal controls ── */}
      <div className="bg-card/95 backdrop-blur-md border-b border-border/60">
        <div className="w-full px-3 sm:px-4 md:px-6 py-2 flex justify-between items-center gap-4">

          {/* Portal title / dynamic content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>

          {/* Quick Ticket + Theme Toggle + User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {onQuickTicket && (
              <Button onClick={onQuickTicket} size="sm" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Ticket</span>
              </Button>
            )}
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
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
                      Role: {user?.role || 'customer'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/customer-portal/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

    </header>
  );
};

export default CustomerPortalHeader;
