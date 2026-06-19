import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { visibleApps, type AppEntry } from "@/lib/app-registry";

// "Back to Hub" is always shown at the top — not part of APPS so it doesn't
// double as a route-match candidate.
const HUB_ITEM: AppEntry = {
  id: "hub",
  name: "Back to Hub",
  description: "Return to Main Hub",
  icon: LayoutGrid,
  path: "/",
  color: "text-primary",
  bgColor: "bg-primary/10",
};

const SuiteSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const apps = visibleApps(userRole);
  const items = [HUB_ITEM, ...apps];

  // Active app = longest path-prefix match (exclude hub). Hub stays the
  // fallback when nothing else matches.
  const matched = apps
    .filter((m) => location.pathname.startsWith(m.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const currentModule = matched ?? HUB_ITEM;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 hidden sm:flex">
          <currentModule.icon
            className={cn("h-4 w-4", currentModule.color)}
          />
          <span className="hidden md:inline">{currentModule.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch Module</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((module) => {
          const Icon = module.icon;
          const isActive = currentModule.id === module.id;

          return (
            <DropdownMenuItem
              key={module.id}
              onClick={() => navigate(module.path)}
              className={cn(
                "cursor-pointer py-3",
                isActive && "bg-accent"
              )}
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn("p-2 rounded-md", module.bgColor)}>
                  <Icon className={cn("h-4 w-4", module.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{module.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {module.description}
                  </div>
                </div>
                {isActive && (
                  <div className="text-xs font-medium text-primary">
                    Active
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SuiteSwitcher;
