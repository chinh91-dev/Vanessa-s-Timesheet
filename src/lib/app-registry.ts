// ============================================================================
// App Registry — single source of truth for top-level platform apps
// ----------------------------------------------------------------------------
// When adding a new top-level app:
//   1. Add an entry below.
//   2. Wire its route under <App /> (App.tsx) — usually with its own Layout.
//   3. (Optional) Update src/pages/ManagementHubPage.tsx if you want a
//      richer tile on the Management Hub. The Hub keeps its own tile config
//      because tile copy + colour blocks differ from the dropdown surface.
//
// Anything that consumes this registry — SuiteSwitcher, Header dropdown,
// future BottomNav app-switcher — picks the new entry up automatically.
// ============================================================================

import {
  Building2,
  Clock,
  Calculator,
  AlertTriangle,
  Key,
  Gauge,
  type LucideIcon,
} from "lucide-react";

export type UserRole =
  | "admin"
  | "manager"
  | "sale_manager"
  | "sale_user"
  | "employee"
  | "customer";

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  /** Tailwind text colour for the icon. */
  color: string;
  /** Tailwind background for the icon tile. */
  bgColor: string;
  /** When set, only these roles see the app. */
  allowedRoles?: UserRole[];
  /** When set, these roles are explicitly denied (overrides allowed). */
  deniedRoles?: UserRole[];
  /** Quick "admin only" sugar — same as allowedRoles=['admin']. */
  adminOnly?: boolean;
}

export const APPS: AppEntry[] = [
  {
    id: "crm",
    name: "CRM",
    description: "Sales & Customer Management",
    icon: Building2,
    path: "/crm",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    deniedRoles: ["customer", "employee"],
  },
  {
    id: "timesheet",
    name: "Timesheet",
    description: "Time Tracking & Management",
    icon: Clock,
    path: "/timesheet",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    deniedRoles: ["customer"],
  },
  {
    id: "capacity-platform",
    name: "Capacity Platform",
    description: "Resource & Capacity Planning",
    icon: Gauge,
    path: "/capacity-platform",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950",
    deniedRoles: ["customer"],
  },
  {
    id: "calculator",
    name: "Cost Calculator",
    description: "Project Cost Analysis",
    icon: Calculator,
    path: "/cost-calculator",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    allowedRoles: ["admin", "manager", "sale_manager", "sale_user"],
  },
  {
    id: "incidents",
    name: "Incident Management",
    description: "Issue Tracking & Resolution",
    icon: AlertTriangle,
    path: "/incident-management",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    deniedRoles: ["customer"],
  },
  {
    id: "api-keys",
    name: "API Keys",
    description: "Manage API keys & integrations",
    icon: Key,
    path: "/api-keys",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    adminOnly: true,
  },
];

/**
 * Visibility check shared by every consumer of the registry.
 * `null`/`undefined` role is treated as logged-out → app hidden.
 */
export const isAppVisibleForRole = (
  app: AppEntry,
  role: UserRole | string | null | undefined
): boolean => {
  if (!role) return false;
  if (app.adminOnly && role !== "admin") return false;
  if (app.deniedRoles?.includes(role as UserRole)) return false;
  if (app.allowedRoles && !app.allowedRoles.includes(role as UserRole)) {
    return false;
  }
  return true;
};

/** Filter APPS by role. */
export const visibleApps = (
  role: UserRole | string | null | undefined
): AppEntry[] => APPS.filter((a) => isAppVisibleForRole(a, role));
