import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../persistence/prisma.service.js";
import { MailService } from "./mail.service.js";
import { PushService } from "./push.service.js";

@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger(OrderNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly push: PushService
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
        await Promise.all([
          this.mail.sendNewOrderNotification(recipient.email, {
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
          }, detailsUrl),
          this.push.sendToUsers([recipient.id], { title: "Neuer Nachfüllauftrag", body: `${order.kit.name} · ${order.items.length} Positionen`, tag: `order-${order.id}`, url: "/admin" })
        ]);
      } catch (error) {
        this.logger.error(`Order notification mail failed for ${recipient.email}`, error instanceof Error ? error.stack : undefined);
      }
    }));
  }
}
