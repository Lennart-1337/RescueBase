import { Body, Controller, Get, Put, Query, Req, BadRequestException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { AlertsService } from "../services/alerts.service.js";

@ApiTags("Alerts")
@Roles("ADMIN", "WAREHOUSE")
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get("warnings")
  async warnings(@Query("category") category?: string, @Query("locationId") locationId?: string) {
    // Refresh on read so changes made by scheduled jobs or external integrations
    // are reflected immediately, even when no mutation endpoint was called.
    await this.alerts.syncAlerts("warnings-read");
    return this.alerts.listWarnings({ category, locationId });
  }

  @Get("subscriptions/me")
  async mySubscriptions(@Req() request: AuthenticatedRequest) {
    return this.alerts.listMySubscriptions(request.user?.id ?? "");
  }

  @Put("subscriptions/me")
  async replaceMySubscriptions(
    @Req() request: AuthenticatedRequest,
    @Body() body: { subscriptions: Array<{ category: "EXPIRY" | "SHORTAGE" | "KIT_CHECK_DUE" | "MPG_DUE"; locationId?: string | null }> }
  ) {
    if (!request.user) {
      throw new BadRequestException("Kein angemeldeter Benutzer gefunden.");
    }
    return this.alerts.replaceMySubscriptions(request.user.id, body.subscriptions ?? []);
  }

}
