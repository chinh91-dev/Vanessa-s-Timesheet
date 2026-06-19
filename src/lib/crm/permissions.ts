/**
 * Role-based permission utilities for CRM
 * 
 * Access Matrix:
 * - admin, manager, sale_manager: Full CRM access (all CRUD)
 * - sale_user: CRM access per RLS policies (limited write)
 * - employee: NO CRM access (unless also has sale_user role)
 * - customer: Deferred for future implementation
 */

export type UserRole = 
  | "admin" 
  | "manager" 
  | "sale_manager" 
  | "sale_user" 
  | "employee" 
  | "customer";

/**
 * Check if user can access CRM Reports
 * (Admin only)
 */
export const canAccessReports = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can access CRM Admin Console
 * (Admin only)
 */
export const canAccessAdmin = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can access CRM module at all
 * (Admin, Sales Manager, Sale User)
 */
export const canAccessCRM = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};

/**
 * Check if user has full management permissions
 * (Admin, Sales Manager)
 */
export const canManageEntity = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager"].includes(role);
};

/**
 * Check if user can delete entities
 * (Admin only)
 */
export const canDeleteEntity = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user is read-only in CRM
 * (sale_user has limited write access per RLS)
 */
export const isReadOnly = (role: string | null | undefined): boolean => {
  return role === "sale_user";
};

/**
 * Check if user can create contacts
 * (Admin, Sales Manager, Sale User can create their own contacts)
 */
export const canCreateContact = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};

// Legacy alias for backward compatibility
export const canCreateLead = canCreateContact;

/**
 * Check if user can create tasks
 * (Admin, Sales Manager, Sale User can create their own tasks)
 */
export const canCreateTask = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};

/**
 * Check if user can manage services
 * (Admin, Sales Manager - not sale_user for discount guard-railing)
 */
export const canManageServices = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager"].includes(role);
};

/**
 * Check if user can view admin console - DEPRECATED, use canAccessAdmin
 * (Admin only)
 */
export const canAccessAdminConsole = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can manage integration jobs
 * (Admin only)
 */
export const canManageIntegrations = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can manually complete tasks
 * (Admin only)
 */
export const canCompleteTask = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can extend task due dates on auto-generated tasks
 * (Admin only - regular users can only adjust during deal creation)
 */
export const canExtendTaskDueDate = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can assign opportunities/deals to others
 * (Admin, Sales Manager)
 */
export const canAssignToOthers = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};

/**
 * Check if user can approve deals
 * (Admin, Sales Manager)
 */
export const canApproveDeals = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager"].includes(role);
};

/**
 * Check if user can view all team data
 * (Admin, Sales Manager)
 */
export const canViewAllTeamData = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager"].includes(role);
};

/**
 * Get permission label for tooltips
 */
export const getPermissionDeniedMessage = (action: string): string => {
  return `You don't have permission to ${action}.`;
};

/**
 * Check specific entity permissions based on ownership
 */
export interface OwnershipCheck {
  role: string | null | undefined;
  ownerId?: string;
  currentUserId?: string;
}

export const canEditEntity = ({ role, ownerId, currentUserId }: OwnershipCheck): boolean => {
  if (canManageEntity(role)) return true;
  // sale_user can edit any deal (broad coverage while colleagues are away)
  if (role === "sale_user") return true;
  if (ownerId && currentUserId && ownerId === currentUserId) return true;
  return false;
};

export const canDeleteOwnedEntity = ({ role, ownerId, currentUserId }: OwnershipCheck): boolean => {
  if (canDeleteEntity(role)) return true;
  if (canManageEntity(role) && ownerId && currentUserId && ownerId === currentUserId) return true;
  return false;
};

/**
 * Check if user can manage contact categories
 * (Admin, Sales Manager, Manager)
 */
export const canManageContactCategories = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "manager"].includes(role);
};

/**
 * Check if user can access the Prospect funnel
 * Admin + sale_manager + sale_user
 */
export const canAccessProspects = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};

/**
 * Check if user can create / edit / manage prospects
 * Admin + sale_manager + sale_user
 */
export const canManageProspect = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};

/**
 * Check if user can delete prospects — admin only
 */
export const canDeleteProspect = (role: string | null | undefined): boolean => {
  return role === "admin";
};

/**
 * Check if user can create or update Accounts
 * (Admin, Sales Manager, Sale User)
 */
export const canManageAccount = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return ["admin", "sale_manager", "sale_user"].includes(role);
};
