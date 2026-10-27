import { Module } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { ServicePermissionsController } from "./service-permissions.controller.js";
import { ServicesGuard } from "./services.guard.js";

@Module({
  controllers: [ServicePermissionsController],
  providers: [PrismaService, ServicesGuard],
  exports: [ServicesGuard],
})
export class ServicesAccessModule {}
