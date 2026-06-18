import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { MailService } from "./mail.service.js";

@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger(OrderNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService
  ) {}

  async notifyNewOrder(orderId: string) {
    const order = await this.prisma.replenishmentOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        kit: { include: { location: true } }
      }
    });
    if (!order) return;

    const recipients = await this.prisma.user.findMany({
      where: { active: true, deletedAt: null, newOrderNotificationsEnabled: true },
      orderBy: { email: "asc" }
    });
    if (recipients.length === 0) return;

    const detailsUrl = `${process.env.APP_PUBLIC_URL ?? "http://localhost:5173"}/`;
    await Promise.all(recipients.map(async (recipient) => {
      try {
        await this.mail.sendNewOrderNotification(recipient.email, {
          id: order.id,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({
            articleName: item.articleName,
            quantity: item.requestedQuantity,
            reason: item.reason,
            unit: item.unit
          })),
          kitCode: order.kit.code,
          kitName: order.kit.name,
          locationName: order.kit.location.name
        }, detailsUrl);
      } catch (error) {
        this.logger.error(`Order notification mail failed for ${recipient.email}`, error instanceof Error ? error.stack : undefined);
      }
    }));
  }
}
