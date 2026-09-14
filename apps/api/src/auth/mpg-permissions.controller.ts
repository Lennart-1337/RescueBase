import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Put, Req } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { Roles } from "./auth.decorators.js";
import type { AuthenticatedRequest } from "./auth.guard.js";
import { PrismaService } from "../persistence/prisma.service.js";

class PermissionBody {
  @IsBoolean()
  medicalDevicesManage!: boolean;
}

@Controller("mpg-permissions")
export class MpgPermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async mine(@Req() request: AuthenticatedRequest) {
    const user = await this.prisma.user.findFirst({ where: { id: request.user!.id, active: true, deletedAt: null } });
    return { medicalDevicesManage: user?.role === "ADMIN" || user?.medicalDevicesManage === true };
  }

  @Roles("ADMIN")
  @Get("users")
  async users() {
    return this.prisma.user.findMany({ where: { deletedAt: null },
      select: { id: true, displayName: true, email: true, role: true, medicalDevicesManage: true }, orderBy: { displayName: "asc" } });
  }

  @Roles("ADMIN")
  @Put("users/:id")
  async update(@Param("id") id: string, @Body() body: PermissionBody, @Req() request: AuthenticatedRequest) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!user) throw new NotFoundException("Benutzerkonto nicht gefunden.");
      if (user.role === "ADMIN" && !body.medicalDevicesManage) throw new BadRequestException("Administratoren besitzen diese Berechtigung immer.");
      await tx.user.update({ where: { id }, data: { medicalDevicesManage: body.medicalDevicesManage } });
      await tx.auditEvent.create({ data: { actorType: "USER", actorLabel: request.user!.email,
        action: "MPG_PERMISSION_CHANGED", entityType: "User", entityId: id,
        payload: { actorId: request.user!.id, permission: "medicalDevices.manage", previous: user.medicalDevicesManage, next: body.medicalDevicesManage } } });
      return { medicalDevicesManage: user.role === "ADMIN" || body.medicalDevicesManage };
    });
  }
}
