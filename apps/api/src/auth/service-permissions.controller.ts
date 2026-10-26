import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
} from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { Roles } from "./auth.decorators.js";
import type { AuthenticatedRequest } from "./auth.guard.js";
import { PrismaService } from "../persistence/prisma.service.js";

class PermissionBody {
  @IsBoolean()
  servicesManage!: boolean;
}

@Controller("service-permissions")
export class ServicePermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async mine(@Req() request: AuthenticatedRequest) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: request.user!.id,
        active: true,
        deletedAt: null,
        banned: false,
        activationRequired: false,
      },
      select: { role: true, servicesManage: true },
    });
    return {
      servicesManage: user?.role === "ADMIN" || user?.servicesManage === true,
    };
  }

  @Roles("ADMIN")
  @Get("users")
  users() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        servicesManage: true,
      },
      orderBy: { displayName: "asc" },
    });
  }

  @Roles("ADMIN")
  @Put("users/:id")
  update(
    @Param("id") id: string,
    @Body() body: PermissionBody,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!user) throw new NotFoundException("Benutzerkonto nicht gefunden.");
      if (user.role === "ADMIN" && !body.servicesManage)
        throw new BadRequestException(
          "Administratoren besitzen diese Berechtigung immer.",
        );
      await tx.user.update({
        where: { id },
        data: { servicesManage: body.servicesManage },
      });
      await tx.auditEvent.create({
        data: {
          actorType: "USER",
          actorLabel: request.user!.email,
          action: "SERVICE_PERMISSION_CHANGED",
          entityType: "User",
          entityId: id,
          payload: {
            actorId: request.user!.id,
            permission: "services.manage",
            previous: user.servicesManage,
            next: body.servicesManage,
          },
        },
      });
      return { servicesManage: user.role === "ADMIN" || body.servicesManage };
    });
  }
}
