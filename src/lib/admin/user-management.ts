import type { RoleName } from "@prisma/client";

export const STAFF_USER_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "OPERATIONS",
  "CLEANER",
  "MARKETING",
];

export function getManageableUserRoles(): RoleName[] {
  return [...STAFF_USER_ROLES];
}

export function isManageableRole(role: RoleName | string): boolean {
  return STAFF_USER_ROLES.includes(role as RoleName);
}

export function normalizeUserInput(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  role: RoleName | string;
}) {
  const name = input.name.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;

  if (!name) {
    throw new Error("Name is required.");
  }

  const role = input.role as RoleName;
  if (!isManageableRole(role)) {
    throw new Error("Only staff roles can be managed from the backend.");
  }

  return { name, email, phone, role };
}
