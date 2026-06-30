import type { UserRole } from "../../lib/types";

export function formatUserRole(role: UserRole) {
  return role === "ADMIN" ? "Admin" : "Lagerwart";
}
