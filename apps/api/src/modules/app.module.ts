import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller.js";
import { AuditController } from "./audit.controller.js";
import { CatalogController } from "./catalog.controller.js";
import { InventoryController } from "./inventory.controller.js";
import { PublicChecksController } from "./public-checks.controller.js";
import { ReplenishmentController } from "./replenishment.controller.js";
import { ReportsController } from "./reports.controller.js";
import { AuditService } from "../services/audit.service.js";
import { MailService } from "../services/mail.service.js";
import { ReportService } from "../services/report.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { AuthService } from "../auth/auth.service.js";

@Module({
  controllers: [
    AuthController,
    AuditController,
    CatalogController,
    InventoryController,
    PublicChecksController,
    ReplenishmentController,
    ReportsController
  ],
  providers: [
    PrismaService,
    AuthService,
    AuditService,
    MailService,
    ReportService,
    { provide: APP_GUARD, useClass: AuthGuard }
  ]
})
export class AppModule {}
