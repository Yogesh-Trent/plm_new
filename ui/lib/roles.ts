// Shared role definitions. Safe to import from both client and server — contains
// NO secrets and NO database access. The 4 roles each get their own dashboard
// route; today every role renders the same full workflow (role-specific extras
// arrive in Phase 2). See IMPLEMENTATION.md.

export const ROLES = ["designer", "buyer", "technologist", "all"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<Role, string> = {
  designer: "Designer",
  buyer: "Buyer",
  technologist: "Technologist",
  all: "All",
};

export const ROLE_BLURBS: Record<Role, string> = {
  designer: "Style intake, colour & BOM workspace",
  buyer: "Supplier commercial & PO planning workspace",
  technologist: "Size ratio & technical validation workspace",
  all: "Full workspace across every role",
};

// Each role owns its own separate run/workspace (confirmed decision #4).
export function dashboardPath(role: Role) {
  return `/${role}`;
}
