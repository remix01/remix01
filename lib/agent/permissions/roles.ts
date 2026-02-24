/**
 * Role Hierarchy and Role-Based Access Control
 * Defines roles and checks if a user role can access a required role level
 */

export type Role = 'guest' | 'user' | 'partner' | 'admin' | 'system'

export const roleHierarchy: Record<Role, number> = {
  guest: 0,
  user: 1,
  partner: 2,
  admin: 3,
  system: 4,
}

/**
 * Check if a user role meets or exceeds a required role level
 * @param userRole The role of the user making the request
 * @param requiredRole The minimum role required for access
 * @returns true if user role >= required role
 */
export function canAccess(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    guest: 'Guest',
    user: 'User',
    partner: 'Partner',
    admin: 'Administrator',
    system: 'System',
  }
  return displayNames[role]
}
