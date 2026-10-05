/**
 * User Roles constants
 */
export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  USER: "USER",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const VALID_ROLES: RoleType[] = [ROLES.SUPERADMIN, ROLES.USER];
