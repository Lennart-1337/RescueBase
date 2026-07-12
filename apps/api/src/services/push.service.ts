import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import webpush from "web-push";
import { PrismaService } from "../persistence/prisma.service.js";
import type { PushMessage, PushSubscriptionInput } from "./push.types.js";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  configuration() {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim();
    return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
  }

  publicConfiguration() {
    const configuration = this.configuration();
    return configuration ? { enabled: true, publicKey: configuration.publicKey } : { enabled: false };
  }

  async register(userId: string, input: PushSubscriptionInput) {
    this.assertConfigured();
    this.validate(input);
    const endpointHash = hashEndpoint(input.endpoint);
    return this.prisma.pushSubscription.upsert({
      where: { endpointHash },
      create: { userId, endpoint: input.endpoint, endpointHash, p256dh: input.keys.p256dh, auth: input.keys.auth, expirationTime: toDate(input.expirationTime) },
      update: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth, expirationTime: toDate(input.expirationTime) }
    });
  }

  async endpointsForUser(userId: string) {
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId }, select: { endpoint: true } });
    return { endpoints: subscriptions.map((subscription) => subscription.endpoint) };
  }

  async remove(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async sendToUsers(userIds: string[], message: PushMessage) {
    const configuration = this.configuration();
    if (!configuration || userIds.length === 0) return;
    webpush.setVapidDetails(configuration.subject, configuration.publicKey, configuration.privateKey);
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { auth: subscription.auth, p256dh: subscription.p256dh } }, JSON.stringify(message), { TTL: 300 });
      } catch (error) {
        const statusCode = statusOf(error);
        if (statusCode === 404 || statusCode === 410) await this.prisma.pushSubscription.delete({ where: { id: subscription.id } });
        else this.logger.error(`Push delivery failed for subscription ${subscription.id}`, error instanceof Error ? error.stack : undefined);
      }
    }));
  }

  private assertConfigured() {
    if (!this.configuration()) throw new BadRequestException("Web Push ist auf diesem Server nicht konfiguriert.");
  }

  private validate(input: PushSubscriptionInput) {
    if (!input?.endpoint || !input.keys?.auth || !input.keys?.p256dh) throw new BadRequestException("Ungültige Push-Subscription.");
    try { if (new URL(input.endpoint).protocol !== "https:") throw new Error(); } catch { throw new BadRequestException("Ungültiger Push-Endpunkt."); }
  }
}

function toDate(value?: number | null) { return value ? new Date(value) : null; }
function statusOf(error: unknown) { return typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined; }
function hashEndpoint(endpoint: string) { return createHash("sha256").update(endpoint).digest("hex"); }
