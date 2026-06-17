import { Body, Controller, Get, Param, Put, Post, Query, Req, BadRequestException, NotFoundException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { AlertsService } from "../services/alerts.service.js";
import { PrismaService } from "../persistence/prisma.service.js";

@ApiTags("Alerts")
@Roles("ADMIN", "WAREHOUSE")
@Controller("alerts")
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly prisma: PrismaService
  ) {}

  @Get("warnings")
  warnings(@Query("category") category?: string, @Query("locationId") locationId?: string) {
    return this.alerts.listWarnings({ category, locationId });
  }

  @Get("subscriptions/me")
  async mySubscriptions(@Req() request: AuthenticatedRequest) {
    return this.alerts.listMySubscriptions(request.user?.id ?? "");
  }

  @Put("subscriptions/me")
  async replaceMySubscriptions(
    @Req() request: AuthenticatedRequest,
    @Body() body: { subscriptions: Array<{ category: "EXPIRY" | "STK_DUE" | "MTK_DUE"; locationId?: string | null }> }
  ) {
    if (!request.user) {
      throw new BadRequestException("Kein angemeldeter Benutzer gefunden.");
    }
    return this.alerts.replaceMySubscriptions(request.user.id, body.subscriptions ?? []);
  }

  @Roles("ADMIN")
  @Get("subscriptions")
  subscriptions() {
    return this.alerts.listAdminSubscriptions();
  }

  @Roles("ADMIN")
  @Post("subscriptions/:userId")
  async replaceUserSubscriptions(
    @Param("userId") userId: string,
    @Body() body: { subscriptions: Array<{ category: "EXPIRY" | "STK_DUE" | "MTK_DUE"; locationId?: string | null }> }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Benutzer nicht gefunden.");
    }
    return this.alerts.replaceMySubscriptions(user.id, body.subscriptions ?? []);
  }
}
