import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import type { AuthenticatedRequest } from "./auth.guard.js";

@Injectable()
export class ServicesGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const current = user
      ? await this.prisma.user.findFirst({
          where: {
            id: user.id,
            active: true,
            deletedAt: null,
            banned: false,
            activationRequired: false,
          },
          select: { role: true, servicesManage: true },
        })
      : null;
    if (current?.role !== "ADMIN" && current?.servicesManage !== true) {
      throw new ForbiddenException(
        "Keine Berechtigung für die Dienstverwaltung.",
      );
    }
    return true;
  }
}
