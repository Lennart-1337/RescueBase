import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@rescuebase/domain";

export const IS_PUBLIC_ROUTE = "isPublicRoute";
export const REQUIRED_ROLES = "requiredRoles";
export const RATE_LIMIT = "rateLimit";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function PublicRoute() {
  return SetMetadata(IS_PUBLIC_ROUTE, true);
}

export function Roles(...roles: UserRole[]) {
  return SetMetadata(REQUIRED_ROLES, roles);
}

export function RateLimit(options: RateLimitOptions) {
  return SetMetadata(RATE_LIMIT, options);
}
