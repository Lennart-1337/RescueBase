import { BadRequestException, Body, Controller, Delete, Get, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { PushService } from "../services/push.service.js";
import type { PushSubscriptionInput } from "../services/push.types.js";

@ApiTags("Push")
@Roles("ADMIN", "WAREHOUSE")
@Controller("push")
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get("config") configuration() { return this.push.publicConfiguration(); }
  @Get("subscriptions/me") subscriptions(@Req() request: AuthenticatedRequest) { return this.push.endpointsForUser(request.user!.id); }
  @Post("subscriptions") register(@Req() request: AuthenticatedRequest, @Body() subscription: PushSubscriptionInput) { return this.push.register(request.user!.id, subscription); }
  @Delete("subscriptions") async remove(@Req() request: AuthenticatedRequest, @Body() body: { endpoint?: string }) {
    if (!body?.endpoint) throw new BadRequestException("Push-Endpunkt fehlt.");
    await this.push.remove(request.user!.id, body.endpoint);
    return { ok: true };
  }
}
