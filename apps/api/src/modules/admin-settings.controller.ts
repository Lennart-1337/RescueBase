import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import { SettingsService } from "../settings/settings.service.js";
import { AlertsService } from "../services/alerts.service.js";
import type { AlertSettingsInput, GeneralSettingsInput, InventorySettingsInput, KitCheckSettingsInput, TemplateSettingsInput } from "../settings/settings.types.js";
import { NotificationTemplatesService } from "../settings/notification-templates.service.js";

@ApiTags("Admin-Einstellungen")
@Roles("ADMIN")
@Controller("admin/settings")
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly templates: NotificationTemplatesService,
    private readonly alerts: AlertsService
  ) {}

  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Post("general")
  updateGeneral(@Body() body: GeneralSettingsInput) {
    return this.settings.updateGeneral(body);
  }

  @Post("alerts")
  updateAlerts(@Body() body: AlertSettingsInput) {
    return this.settings.updateAlerts(body);
  }

  @Post("alerts/digest")
  runDailyDigest() {
    return this.alerts.runDailyDigest();
  }

  @Post("inventory")
  updateInventory(@Body() body: InventorySettingsInput) {
    return this.settings.updateInventory(body);
  }

  @Post("kit-checks")
  async updateKitChecks(@Body() body: KitCheckSettingsInput) {
    const settings = await this.settings.updateKitChecks(body);
    await this.alerts.syncAlerts("kit-check-settings-updated");
    return settings;
  }

  @Post("templates/:key")
  updateTemplate(@Param("key") key: string, @Body() body: TemplateSettingsInput) {
    return this.templates.update(key, body);
  }

  @Post("templates/:key/preview")
  previewTemplate(@Param("key") key: string, @Body() body: TemplateSettingsInput) {
    return this.templates.preview(key, body);
  }
}
