import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@rescuebase/domain";
import type { Request } from "express";
import { IS_PUBLIC_ROUTE, REQUIRED_ROLES } from "./auth.decorators.js";
import { SESSION_COOKIE_NAME } from "./auth.constants.js";
import { AuthService, type AuthenticatedUser } from "./auth.service.js";

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  cookies: Record<string, string | undefined>;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.authenticateSession(request.cookies?.[SESSION_COOKIE_NAME]);
    if (!user) {
      throw new UnauthorizedException("Bitte melden Sie sich an.");
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass()
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Keine Berechtigung für diese Aktion.");
    }

    request.user = user;
    return true;
  }
}
