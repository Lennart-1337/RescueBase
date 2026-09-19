import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller.js";
import { AccountActivationController } from "./account-activation.controller.js";
import { AdminSettingsController } from "./admin-settings.controller.js";
import { AlertsController } from "./alerts.controller.js";
import { AuditController } from "./audit.controller.js";
import { CatalogController } from "./catalog.controller.js";
import { CheckRecordsController } from "./check-records.controller.js";
import { MedicalDevicesController } from "./medical-devices.controller.js";
import { InventoryController } from "./inventory.controller.js";
import { PublicChecksController } from "./public-checks.controller.js";
import { PushController } from "./push.controller.js";
import { PurchaseOrdersController } from "./purchase-orders.controller.js";
import { ReplenishmentController } from "./replenishment.controller.js";
import { ReportsController } from "./reports.controller.js";
import { AuditService } from "../services/audit.service.js";
import { CheckRecordsService } from "../services/check-records.service.js";
import { AlertsService } from "../services/alerts.service.js";
import { MailService } from "../services/mail.service.js";
import { OrderNotificationsService } from "../services/order-notifications.service.js";
import { InventoryProcurementService } from "../services/inventory-procurement.service.js";
import { PurchaseOrdersService } from "../services/purchase-orders.service.js";
import { ReportService } from "../services/report.service.js";
import { PushService } from "../services/push.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { RateLimitGuard } from "../auth/rate-limit.guard.js";
import { RateLimitService } from "../auth/rate-limit.service.js";
import { AuthService } from "../auth/auth.service.js";
import { BetterAuthService } from "../auth/better-auth.service.js";
import { AccountActivationService } from "../auth/account-activation.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { NotificationTemplatesService } from "../settings/notification-templates.service.js";
import { MpgPermissionsController } from "../auth/mpg-permissions.controller.js";
import { MpgGuard } from "../auth/mpg.guard.js";
import { MpgDocumentsController } from "./mpg-documents.controller.js";
import { MpgReportsController } from "./mpg-reports.controller.js";
import { MpgController } from "./mpg.controller.js";
import { MpgDocumentsService } from "../services/mpg-documents.service.js";
import { MpgReportsService } from "../services/mpg-reports.service.js";
import { MpgNotificationsService } from "../services/mpg-notifications.service.js";
import { MpgCylindersService } from "../services/mpg-cylinders.service.js";
import { MpgDevicesService } from "../services/mpg-devices.service.js";
import { MpgInspectionsService } from "../services/mpg-inspections.service.js";
import { MpgModelsService } from "../services/mpg-models.service.js";
import { MpgOperationsService } from "../services/mpg-operations.service.js";
import { MpgPeopleService } from "../services/mpg-people.service.js";
import { MpgTrainingsService } from "../services/mpg-trainings.service.js";

@Module({
  controllers: [
    AdminSettingsController,
    AccountActivationController,
    AuthController,
    AlertsController,
    AuditController,
    CheckRecordsController,
    CatalogController,
    MedicalDevicesController,
    MpgPermissionsController,
    MpgController,
    MpgDocumentsController,
    MpgReportsController,
    InventoryController,
    PublicChecksController,
    PushController,
    PurchaseOrdersController,
    ReplenishmentController,
    ReportsController
  ],
  providers: [
    PrismaService,
    BetterAuthService,
    AccountActivationService,
    AuthService,
    AuditService,
    CheckRecordsService,
    AlertsService,
    InventoryProcurementService,
    PurchaseOrdersService,
    MailService,
    OrderNotificationsService,
    ReportService,
    PushService,
    SettingsService,
    NotificationTemplatesService,
    RateLimitService,
    MpgGuard,
    MpgModelsService,
    MpgDevicesService,
    MpgInspectionsService,
    MpgPeopleService,
    MpgTrainingsService,
    MpgOperationsService,
    MpgCylindersService,
    MpgDocumentsService,
    MpgReportsService,
    MpgNotificationsService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AuthGuard }
  ]
})
export class AppModule {}
