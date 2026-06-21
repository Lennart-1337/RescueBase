import { Injectable, Logger } from "@nestjs/common";
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

export interface MailDeliveryResult {
  debugCode?: string;
  debugUrl?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

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
    return this.send({ email, ...buildImmediateAlertMail(alert, detailsUrl) });
  }

  async sendAlertDigest(email: string, digest: AlertDigestMail, detailsUrl: string): Promise<MailDeliveryResult> {
    return this.send({ email, ...buildAlertDigestMail(digest, detailsUrl) });
  }

  async sendNewOrderNotification(email: string, order: Parameters<typeof buildNewOrderMail>[0], detailsUrl: string): Promise<MailDeliveryResult> {
    return this.send({ email, ...buildNewOrderMail(order, detailsUrl) });
  }

  private async send(input: { email: string } & MailContent): Promise<MailDeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      this.logger.log(`MAIL ${input.subject} -> ${input.email}\n${input.text}`);
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
