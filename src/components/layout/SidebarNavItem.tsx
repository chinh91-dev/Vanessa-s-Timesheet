
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarContext } from '@/context/SidebarContext';

interface SidebarNavItemProps {
    to: string;
    icon: LucideIcon;
    label: string;
    isHub?: boolean;
    /** When true, only the exact pathname match counts as active (no
     *  prefix match against children). Use for index/landing entries. */
    end?: boolean;
    description?: string;
    className?: string; // Allow passing specific styling if needed
}

export const SidebarNavItem = ({ to, icon: Icon, label, isHub, end, description, className }: SidebarNavItemProps) => {
    const { isCollapsed } = useSidebarContext();
    const location = useLocation();

    // Check strict equality for hub and dashboard routes, startsWith for others
    const isActive = isHub || end
        ? location.pathname === to
        : location.pathname === to ||
          (to !== '/' && to !== '/incident-management' && location.pathname.startsWith(to + '/'));

    return (
        <Link
            to={to}
            className={cn(
                "relative flex items-center space-x-2 py-2.5 rounded-lg px-3 group transition-all duration-200 ease-out overflow-hidden",
                isCollapsed ? 'justify-center' : '',
                isHub
                    ? 'bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10'
                    : isActive
                        ? 'bg-primary/5 text-primary'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground',
                className
            )}
            title={isCollapsed ? label : undefined}
        >
            {/* Active indicator for non-hub items */}
            {!isHub && isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />
            )}

            {/* Active hover indicator for non-hub non-active items */}
            {!isHub && !isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300 group-hover:h-1/2 opacity-0 group-hover:opacity-100" />
            )}

            <Icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-transform duration-300",
                isHub ? 'text-primary' : 'group-hover:scale-110 group-hover:text-primary',
                isActive && !isHub && 'text-primary scale-110'
            )} />

            {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                    <span className={cn(
                        "font-medium transition-all duration-300 block truncate",
                        isHub ? 'text-primary' : ''
                    )}>
                        {label}
                    </span>
                    {description && (
                        <p className="text-xs text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 absolute -bottom-2 left-8 sm:static sm:opacity-70 sm:group-hover:opacity-100">
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Hover effect background */}
            {!isHub && !isActive && (
                <div className="absolute inset-0 bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            )}
        </Link>
    );
};
