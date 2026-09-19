import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service.js';
import { MailService } from './mail.service.js';
import { PushService } from './push.service.js';
import { deviceInclude, deviceState } from './mpg-device-state.js';
import { buildMpgReminders, type MpgReminder } from './mpg-reminders.js';

@Injectable()
export class MpgNotificationsService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(MpgNotificationsService.name);
  constructor(private readonly db: PrismaService, private readonly mail: MailService, private readonly push: PushService) {}
  onApplicationBootstrap() {
    if (process.env.NODE_ENV !== 'production') return;
    void this.scan().catch(error => this.logger.error(error));
    this.timer = setInterval(() => void this.scan().catch(error => this.logger.error(error)), 60 * 60_000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async scan(now = new Date()) {
    if (process.env.NODE_ENV !== 'production' || this.running) return;
    this.running = true;
    try {
      const devices = await this.db.mpgDevice.findMany({ where: { retiredAt: null }, include: deviceInclude });
      const recipients = await this.db.user.findMany({ where: { active: true, deletedAt: null,
        OR: [{ role: 'ADMIN' }, { medicalDevicesManage: true }] } });
      for (const device of devices) {
        const state = deviceState(device, now);
        for (const event of buildMpgReminders(state, now.toISOString().slice(0, 10))) {
          for (const user of recipients) {
            const path = `/admin/mpg?view=devices&device=${encodeURIComponent(event.deviceId)}`;
            if (process.env.RESEND_API_KEY?.trim()) await this.deliver(event, user.id, 'EMAIL', () => this.mail.sendImmediateAlert(user.email, { category: 'MPG_DUE', details: event.details, dueAt: event.dueAt, recipientName: user.displayName, title: event.title }, `${process.env.APP_PUBLIC_URL ?? 'http://localhost:5173'}${path}`));
            if (this.push.configuration()) await this.deliver(event, user.id, 'PUSH', () => this.push.sendToUsers([user.id], { title: event.title, body: event.details, tag: event.key, url: path }));
          }
        }
      }
    } finally { this.running = false; }
  }
  private async deliver(event: MpgReminder, userId: string, channel: string, send: () => Promise<unknown>) {
    // Durable claim before sending prevents duplicate immediate sends across processes.
    let claim: { id: string };
    try { claim = await this.db.mpgNotification.create({ data: { eventKey: event.key, userId, channel } }); }
    catch (error) { if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return; throw error; }
    try { await send(); }
    catch (error) {
      await this.db.mpgNotification.delete({ where: { id: claim.id } });
      this.logger.error(`MPG ${channel} delivery failed`, error instanceof Error ? error.stack : undefined);
    }
  }
}
