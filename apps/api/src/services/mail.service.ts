import { Injectable, Logger } from "@nestjs/common";

export interface MailDeliveryResult {
  debugCode?: string;
  debugUrl?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendInvitation(email: string, invitationUrl: string): Promise<MailDeliveryResult> {
    return this.send({
      email,
      subject: "RescueBase Einladung",
      text: `Sie wurden zu RescueBase eingeladen.\n\nEinladung öffnen: ${invitationUrl}\n`,
      debugUrl: invitationUrl
    });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<MailDeliveryResult> {
    return this.send({
      email,
      subject: "RescueBase Passwort zurücksetzen",
      text: `Setzen Sie Ihr RescueBase-Passwort zurück.\n\nLink: ${resetUrl}\n`,
      debugUrl: resetUrl
    });
  }

  async sendEmailTwoFactorCode(email: string, code: string): Promise<MailDeliveryResult> {
    return this.send({
      email,
      subject: "RescueBase Sicherheitscode",
      text: `Ihr RescueBase-Sicherheitscode lautet: ${code}\n`,
      debugCode: code
    });
  }

  private async send(input: { email: string; subject: string; text: string; debugUrl?: string; debugCode?: string }): Promise<MailDeliveryResult> {
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
        text: input.text
      })
    });
    if (!response.ok) {
      throw new Error(`Resend mail delivery failed with status ${response.status}: ${await response.text()}`);
    }
    return {};
  }
}
