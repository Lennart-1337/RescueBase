import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../auth/auth.decorators.js";
import type { AuthenticatedRequest } from "../../auth/auth.guard.js";
import { ServicesGuard } from "../../auth/services.guard.js";
import { ServiceBillingSettingsService } from "../../settings/service-billing/service.js";
@ApiTags("Admin-Einstellungen")
@Roles("ADMIN")
@Controller("admin/settings/service-billing")
export class AdminServiceBillingSettingsController {
  constructor(private readonly settings: ServiceBillingSettingsService) {}
  @Get() get() {
    return this.settings.get();
  }
  @Post() update(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    return this.settings.update(body, req.user!.id);
  }
}
@ApiTags("Dienste")
@UseGuards(ServicesGuard)
@Controller("services/billing-settings")
export class ServiceBillingSettingsController {
  constructor(private readonly settings: ServiceBillingSettingsService) {}
  @Get() get() {
    return this.settings.get();
  }
}
