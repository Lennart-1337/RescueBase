import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@prisma/client";

export const IS_PUBLIC_ROUTE = "isPublicRoute";
export const REQUIRED_ROLES = "requiredRoles";

export function PublicRoute() {
  return SetMetadata(IS_PUBLIC_ROUTE, true);
}

export function Roles(...roles: UserRole[]) {
  return SetMetadata(REQUIRED_ROLES, roles);
}
