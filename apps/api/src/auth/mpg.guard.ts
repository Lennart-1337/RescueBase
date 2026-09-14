import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import type { AuthenticatedRequest } from "./auth.guard.js";

@Injectable()
export class MpgGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new ForbiddenException("Keine Berechtigung für die Medizinprodukteverwaltung.");
    // Check the database so revoking access takes effect even with a cached session.
    const current = await this.prisma.user.findFirst({
      where: { id: user.id, active: true, deletedAt: null, banned: false, activationRequired: false },
      select: { role: true, medicalDevicesManage: true }
    });
    if (current?.role !== "ADMIN" && current?.medicalDevicesManage !== true) {
      throw new ForbiddenException("Keine Berechtigung für die Medizinprodukteverwaltung.");
    }
    return true;
  }
}
