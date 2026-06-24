import { Injectable, Logger, Optional } from "@nestjs/common";
import type { AlertWarning } from "../alerts/alert-engine.js";
import {
  buildAlertDigestMail,
  buildAlertMail,
  buildEmailTwoFactorCodeMail,
  buildImmediateAlertMail,
  buildInvitationMail,
  buildNewOrderMail,
  buildPasswordResetMail,
  type AlertDigestMail,
  type ImmediateAlertMail,
  type MailContent
} from "./mail-messages.js";
import { NotificationTemplatesService } from "../settings/notification-templates.service.js";

export interface MailDeliveryResult {
  debugCode?: string;
  debugUrl?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Optional() private readonly templates?: NotificationTemplatesService) {}

  async sendInvitation(email: string, invitationUrl: string): Promise<MailDeliveryResult> {
    return this.send({ email, ...buildInvitationMail(invitationUrl) });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<MailDeliveryResult> {
    return this.send({ email, ...buildPasswordResetMail(resetUrl) });
  }

  async sendEmailTwoFactorCode(email: string, code: string): Promise<MailDeliveryResult> {
    return this.send({ email, ...buildEmailTwoFactorCodeMail(code) });
  }

  async sendAlert(email: string, subject: string, warnings: AlertWarning[], detailsUrl: string): Promise<MailDeliveryResult> {
    return this.send({ email, ...buildAlertMail(subject, warnings, detailsUrl) });
  }

  async sendImmediateAlert(email: string, alert: ImmediateAlertMail, detailsUrl: string): Promise<MailDeliveryResult> {
    const content = this.templates
      ? await this.templates.render("ALERT_IMMEDIATE", {
        recipientName: alert.recipientName,
        title: alert.title,
        category: formatCategory(alert.category),
        dueDate: formatDueDate(alert.dueAt),
        details: alert.details,
        detailsUrl
      })
      : buildImmediateAlertMail(alert, detailsUrl);
    return this.send({ email, ...content });
  }

  async sendAlertDigest(email: string, digest: AlertDigestMail, detailsUrl: string): Promise<MailDeliveryResult> {
    const warnings = digest.warnings.map((warning) =>
      `[${formatCategory(warning.category)}] ${warning.title} (${warning.locationName ?? "ohne Standort"}) · Fällig: ${formatDueDate(warning.dueAt)}`
    );
    const content = this.templates
      ? await this.templates.render("ALERT_DIGEST", { recipientName: digest.recipientName, warningCount: String(warnings.length), warnings: warnings.join("\n"), detailsUrl })
      : buildAlertDigestMail(digest, detailsUrl);
    return this.send({ email, ...content });
  }

  async sendNewOrderNotification(email: string, order: Parameters<typeof buildNewOrderMail>[0], detailsUrl: string): Promise<MailDeliveryResult> {
    const items = order.items.map((item) => `${item.quantity} ${item.unit} ${item.articleName} (${formatReason(item.reason)})`).join("\n");
    const content = this.templates
      ? await this.templates.render("NEW_ORDER", {
        orderId: order.id,
        kitName: order.kitName,
        kitCode: order.kitCode,
        locationName: order.locationName,
        createdAt: order.createdAt.toISOString(),
        items,
        detailsUrl
      })
      : buildNewOrderMail(order, detailsUrl);
    return this.send({ email, ...content });
  }

  private async send(input: { email: string } & MailContent): Promise<MailDeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      this.logger.log(`MAIL ${input.subject} -> ${input.email}\n${input.text}`);
      if (process.env.NODE_ENV === "production") {
        return {};
      }
      return {
        debugCode: input.debugCode,
        debugUrl: input.debugUrl
      };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "RescueBase <noreply@example.org>",
        to: [input.email],
        subject: input.subject,
        text: input.text,
        html: input.html
      })
    });
    if (!response.ok) {
      throw new Error(`Resend mail delivery failed with status ${response.status}: ${await response.text()}`);
    }
    return {};
  }
}

function formatCategory(category: string) {
  if (category === "EXPIRY") return "Ablauf";
  if (category === "STK_DUE") return "STK";
  if (category === "MTK_DUE") return "MTK";
  return category;
}

function formatDueDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "sofort";
}

function formatReason(reason: string) {
  if (reason === "DISCARDED_EXPIRED") return "Ablauf entsorgt";
  if (reason === "SHORTAGE_AND_DISCARDED_EXPIRED") return "Fehlbestand und Ablauf";
  return "Fehlbestand";
}
