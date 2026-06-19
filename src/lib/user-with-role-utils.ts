/**
 * Utilities for working with users and their roles
 * Roles are stored in separate user_roles table, not in profiles
 */

import { getUserRole } from "@/utils/roles";
import type { User, UserWithRole } from "./user-service";

/**
 * Fetch user role from user_roles table and attach to user object
 */
export async function attachUserRole(user: User): Promise<UserWithRole> {
  const role = await getUserRole(user.id);
  return {
    ...user,
    role
  };
}

/**
 * Fetch roles for multiple users from user_roles table
 */
export async function attachUserRoles(users: User[]): Promise<UserWithRole[]> {
  return Promise.all(users.map(user => attachUserRole(user)));
}
