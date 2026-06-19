import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Clock, BarChart3, Users, Menu, Kanban, Building2, User, Calendar,
  Receipt, MapPin, Plane, FolderKanban, AlertTriangle, FileText, Settings, LayoutGrid, Handshake, CheckSquare, Package, Archive
} from 'lucide-react';
import { useDevice } from '@/context/DeviceContext';
import { triggerHaptic } from '@/utils/haptic';
import { BottomNavItem, type BottomNavItemData } from './BottomNavItem';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// Extended interface with permission fields
interface BottomNavItemWithPermissions extends BottomNavItemData {
  requiredRoles?: string[];
  requiresManagerOrAbove?: boolean;
  requiresAdmin?: boolean;
}

// Timesheet Suite navigation items (main nav - shown to all)
const timesheetNavItems: BottomNavItemData[] = [
  { label: 'Timesheet', icon: Clock, path: '/timesheet' },
  { label: 'Dashboard', icon: BarChart3, path: '/timesheet/dashboard' },
  { label: 'Expenses', icon: Receipt, path: '/timesheet/expenses' },
  { label: 'More', icon: Menu, path: '#more' },
];

// CRM Suite navigation items (main nav - shown to all CRM users)
const crmNavItems: BottomNavItemData[] = [
  { label: 'Pipeline', icon: Kanban, path: '/crm/pipeline' },
  { label: 'Contacts', icon: User, path: '/crm/contacts' },
  { label: 'Accounts', icon: Building2, path: '/crm/accounts' },
  { label: 'More', icon: Menu, path: '#more' },
];

// Additional items for "More" sheet - with permission requirements
const timesheetMoreItems: BottomNavItemWithPermissions[] = [
  { label: 'Team', icon: Users, path: '/timesheet/team', requiresManagerOrAbove: true },
  { label: 'Work Location', icon: MapPin, path: '/timesheet/work-location' }, // All users
  { label: 'Leave App', icon: Plane, path: '/timesheet/leave-application' }, // All users
  { label: 'Reports', icon: BarChart3, path: '/timesheet/reports', requiresManagerOrAbove: true },
  { label: 'Projects', icon: FolderKanban, path: '/timesheet/projects', requiresAdmin: true },
  { label: 'Customers', icon: Users, path: '/timesheet/customers', requiresAdmin: true },
  { label: 'Work Schedule', icon: Clock, path: '/timesheet/work-schedule', requiresAdmin: true },
  { label: 'OHS', icon: AlertTriangle, path: '/timesheet/ohs', requiresManagerOrAbove: true },
  { label: 'Contracts', icon: FileText, path: '/timesheet/contracts', requiresManagerOrAbove: true },
  { label: 'Settings', icon: Settings, path: '/timesheet/settings', requiresAdmin: true },
  { label: 'Back to Hub', icon: LayoutGrid, path: '/' }, // All users
];

const crmMoreItems: BottomNavItemWithPermissions[] = [
  { label: 'Deals', icon: Handshake, path: '/crm/deals' }, // All CRM users
  { label: 'Tasks', icon: CheckSquare, path: '/crm/tasks' }, // All CRM users
  { label: 'Meetings', icon: Calendar, path: '/crm/meetings' }, // All CRM users
  { label: 'Services', icon: Package, path: '/crm/services', requiredRoles: ['admin', 'sale_manager'] },
  { label: 'Reports', icon: BarChart3, path: '/crm/reports', requiresAdmin: true },
  { label: 'Archive', icon: Archive, path: '/crm/archive' }, // All CRM users
  { label: 'Admin', icon: Settings, path: '/crm/admin', requiresAdmin: true },
  { label: 'Back to Hub', icon: LayoutGrid, path: '/' }, // All users
];

type SuiteType = 'timesheet' | 'crm';

// Explicit colors per suite — bypasses CSS variable inheritance issues with portals
const SUITE_COLORS: Record<SuiteType, string> = {
  timesheet: 'hsl(220, 90%, 56%)',   // blue  (matches :root --primary)
  crm:       'hsl(271.5, 81.3%, 55.9%)', // purple (matches CRMLayout --primary)
};

interface BottomNavProps {
  suite?: SuiteType;
}

export const BottomNav: React.FC<BottomNavProps> = ({ suite }) => {
  const { isMobile, safeAreaBottom } = useDevice();
  const { userRole } = useAuth();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect suite based on current path if not provided
  const currentSuite = suite || (location.pathname.startsWith('/crm') ? 'crm' : 'timesheet');
  const activeColor = SUITE_COLORS[currentSuite];

  const navItems = currentSuite === 'crm' ? crmNavItems : timesheetNavItems;
  const moreItems = currentSuite === 'crm' ? crmMoreItems : timesheetMoreItems;

  // Filter items based on user permissions
  const filterByPermission = (items: BottomNavItemWithPermissions[]): BottomNavItemData[] => {
    return items.filter(item => {
      // Items with no restrictions are visible to all
      if (!item.requiredRoles && !item.requiresManagerOrAbove && !item.requiresAdmin) {
        return true;
      }

      // Admin-only items
      if (item.requiresAdmin) {
        return userRole === 'admin';
      }

      // Manager or above (manager, sale_manager, admin)
      if (item.requiresManagerOrAbove) {
        return ['admin', 'manager', 'sale_manager'].includes(userRole || '');
      }

      // Specific roles required
      if (item.requiredRoles) {
        return item.requiredRoles.includes(userRole || '');
      }

      return false;
    });
  };

  // Apply filtering to more items
  const filteredMoreItems = filterByPermission(moreItems);

  // Only show on mobile
  if (!isMobile) return null;

  const handleNavClick = (item: BottomNavItemData) => {
    triggerHaptic('light');

    if (item.path === '#more') {
      setMoreSheetOpen(true);
    } else {
      navigate(item.path);
    }
  };

  const handleMoreItemClick = (item: BottomNavItemData) => {
    triggerHaptic('medium');
    navigate(item.path);
    setMoreSheetOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '#more') return false;
    // Exact match for index routes
    if (path === '/timesheet' || path === '/crm/pipeline') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 glass border-t-0",
          "transition-transform duration-300 ease-in-out",
          // Always visible
          "translate-y-0"
        )}
        style={{ paddingBottom: `${safeAreaBottom}px` }}
        aria-label="Main navigation"
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <BottomNavItem
              key={item.path}
              item={item}
              isActive={isActive(item.path)}
              onClick={() => handleNavClick(item)}
              activeColor={activeColor}
            />
          ))}
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div
        className="h-16"
        style={{ marginBottom: `${safeAreaBottom}px` }}
        aria-hidden="true"
      />

      {/* More Sheet */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="h-[65vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader>
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-4 mt-6 pb-8">
            {filteredMoreItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleMoreItemClick(item)}
                className={cn(
                  "flex flex-col items-center justify-start gap-2 p-2 rounded-xl h-24",
                  "hover:bg-accent transition-colors",
                  "active:scale-95"
                )}
              >
                <div className="p-3 bg-secondary/50 rounded-full">
                  <item.icon className="h-6 w-6" style={{ color: activeColor }} />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
