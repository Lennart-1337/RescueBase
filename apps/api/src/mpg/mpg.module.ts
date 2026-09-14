import { Module } from "@nestjs/common";
import { MpgGuard } from "../auth/mpg.guard.js";
import { MpgDocumentsController } from "../mpg-files/documents.controller.js";
import { MpgDocumentsService } from "../mpg-files/documents.service.js";
import { MpgReportsController } from "../mpg-files/mpg-reports.controller.js";
import { MpgReportsService } from "../mpg-files/mpg-reports.service.js";
import { MpgNotificationsService } from "../mpg-notifications/mpg-notifications.service.js";
import { PrismaService } from "../persistence/prisma.service.js";
import { MailService } from "../services/mail.service.js";
import { PushService } from "../services/push.service.js";
import { MpgController } from "./mpg.controller.js";
import { MpgCylindersService } from "./mpg-cylinders.service.js";
import { MpgDevicesService } from "./mpg-devices.service.js";
import { MpgInspectionsService } from "./mpg-inspections.service.js";
import { MpgModelsService } from "./mpg-models.service.js";
import { MpgOperationsService } from "./mpg-operations.service.js";
import { MpgPeopleService } from "./mpg-people.service.js";
import { MpgTrainingsService } from "./mpg-trainings.service.js";

@Module({
  controllers: [MpgController, MpgDocumentsController, MpgReportsController],
  providers: [PrismaService, MpgGuard, MpgModelsService, MpgDevicesService, MpgInspectionsService,
    MpgPeopleService, MpgTrainingsService, MpgOperationsService, MpgCylindersService,
    MpgDocumentsService, MpgReportsService, MpgNotificationsService, MailService, PushService],
  exports: [MpgDevicesService, MpgDocumentsService]
})
export class MpgModule {}
