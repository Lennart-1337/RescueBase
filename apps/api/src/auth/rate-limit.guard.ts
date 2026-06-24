import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RATE_LIMIT, type RateLimitOptions } from "./auth.decorators.js";
import { RateLimitService } from "./rate-limit.service.js";

type RateLimitedRequest = Request & {
  body?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: RateLimitService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const key = [
      request.method,
      request.route?.path ?? request.path,
      request.ip ?? request.socket.remoteAddress ?? "unknown",
      requestIdentity(request)
    ].join(":");

    if (!this.limits.hit(key, options.limit, options.windowMs)) {
      throw new HttpException("Zu viele Versuche. Bitte später erneut probieren.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

function requestIdentity(request: RateLimitedRequest): string {
  const body = request.body ?? {};
  return firstString(
    body.email,
    body.loginChallengeId,
    body.emailChallengeId,
    body.token,
    request.params?.token,
    request.params?.id
  ) ?? "anonymous";
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return undefined;
}
