import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller.js";
import { AdminSettingsController } from "./admin-settings.controller.js";
import { AlertsController } from "./alerts.controller.js";
import { AuditController } from "./audit.controller.js";
import { CatalogController } from "./catalog.controller.js";
import { CheckRecordsController } from "./check-records.controller.js";
import { MedicalDevicesController } from "./medical-devices.controller.js";
import { InventoryController } from "./inventory.controller.js";
import { PublicChecksController } from "./public-checks.controller.js";
import { ReplenishmentController } from "./replenishment.controller.js";
import { ReportsController } from "./reports.controller.js";
import { AuditService } from "../services/audit.service.js";
import { CheckRecordsService } from "../services/check-records.service.js";
import { AlertsService } from "../services/alerts.service.js";
import { MailService } from "../services/mail.service.js";
import { OrderNotificationsService } from "../services/order-notifications.service.js";
import { InventoryProcurementService } from "../services/inventory-procurement.service.js";
import { ReportService } from "../services/report.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { AuthService } from "../auth/auth.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { NotificationTemplatesService } from "../settings/notification-templates.service.js";

@Module({
  controllers: [
    AdminSettingsController,
    AuthController,
    AlertsController,
    AuditController,
    CheckRecordsController,
    CatalogController,
    MedicalDevicesController,
    InventoryController,
    PublicChecksController,
    ReplenishmentController,
    ReportsController
  ],
  providers: [
    PrismaService,
    AuthService,
    AuditService,
    CheckRecordsService,
    AlertsService,
    InventoryProcurementService,
    MailService,
    OrderNotificationsService,
    ReportService,
    SettingsService,
    NotificationTemplatesService,
    { provide: APP_GUARD, useClass: AuthGuard }
  ]
})
export class AppModule {}
