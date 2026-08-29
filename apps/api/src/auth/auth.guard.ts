import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@rescuebase/domain";
import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { IS_PUBLIC_ROUTE, REQUIRED_ROLES } from "./auth.decorators.js";
import { AuthService, type AuthenticatedUser } from "./auth.service.js";
import { BetterAuthService } from "./better-auth.service.js";

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  cookies: Record<string, string | undefined>;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: BetterAuthService,
    private readonly legacyAuth: AuthService
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
    const session = await this.auth.instance.api.getSession({ headers: fromNodeHeaders(request.headers) });
    const user = session?.user && isActiveUser(session.user)
      ? toAuthenticatedUser(session.user)
      : await this.legacyUser(request);
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

  private async legacyUser(request: AuthenticatedRequest): Promise<AuthenticatedUser | null> {
    if (process.env.AUTH_LEGACY_SESSIONS_ENABLED === "false") return null;
    return this.legacyAuth.authenticateSession(request.cookies?.rb_session);
  }
}

function isActiveUser(user: Record<string, unknown>): boolean {
  return user.active === true && user.banned !== true && user.activationRequired !== true;
}

function toAuthenticatedUser(user: Record<string, unknown>): AuthenticatedUser {
  return {
    id: String(user.id),
    email: String(user.email),
    displayName: String(user.name),
    role: user.role === "ADMIN" ? "ADMIN" : "WAREHOUSE",
    twoFactorEnabled: user.twoFactorEnabled === true,
    newOrderNotificationsEnabled: user.newOrderNotificationsEnabled === true
  };
}
