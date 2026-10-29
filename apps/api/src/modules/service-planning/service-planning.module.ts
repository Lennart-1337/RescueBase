import { Module } from "@nestjs/common";
import { ServicesAccessModule } from "../../auth/services-access.module.js";
import { PrismaService } from "../../persistence/prisma.service.js";
import { ServiceEventsService } from "../../services/service-planning/events.service.js";
import { ServiceCatalogService } from "../../services/service-planning/catalog.service.js";
import { ServiceCalculationsService } from "../../services/service-planning/calculations.service.js";
import { ServiceDocumentsService } from "../../services/service-planning/documents.service.js";
import { ServiceStatisticsService } from "../../services/service-planning/statistics.service.js";
import { ServiceEventsController } from "./events.controller.js";
import { ServiceCatalogController } from "./catalog.controller.js";
import { ServiceDocumentsController } from "./documents.controller.js";
import { ServiceStatisticsController } from "./statistics.controller.js";
import { ServiceBillingDocumentsController } from "./billing-documents.controller.js";
import { ServiceBillingDocumentsService } from "../../services/service-planning/billing/documents.service.js";
import { AdminServiceBillingSettingsController, ServiceBillingSettingsController } from "./billing-settings.controller.js";
import { ServiceBillingSettingsService } from "../../settings/service-billing/service.js";
@Module({
  imports: [ServicesAccessModule],
  controllers: [
    AdminServiceBillingSettingsController,
    ServiceBillingSettingsController,
    ServiceBillingDocumentsController,
    ServiceCatalogController,
    ServiceStatisticsController,
    ServiceDocumentsController,
    ServiceEventsController,
  ],
  providers: [
    ServiceBillingSettingsService,
    ServiceBillingDocumentsService,
    PrismaService,
    ServiceEventsService,
    ServiceCatalogService,
    ServiceCalculationsService,
    ServiceDocumentsService,
    ServiceStatisticsService,
  ],
})
export class ServicePlanningModule {}
