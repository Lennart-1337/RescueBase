import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

export interface MailDeliveryResult {
  provider: "console" | "smtp";
  debugCode?: string;
  debugUrl?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporterPromise: Promise<nodemailer.Transporter> | null = null;

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
    const provider = (process.env.MAIL_PROVIDER ?? "console").toLowerCase();
    if (provider === "smtp") {
      const transporter = await this.getTransporter();
      await transporter.sendMail({
        from: process.env.MAIL_FROM ?? "RescueBase <noreply@example.org>",
        to: input.email,
        subject: input.subject,
        text: input.text
      });
      return { provider: "smtp" };
    }

    this.logger.log(`MAIL ${input.subject} -> ${input.email}\n${input.text}`);
    return {
      provider: "console",
      debugCode: input.debugCode,
      debugUrl: input.debugUrl
    };
  }

  private getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = Promise.resolve(
        nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER
            ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD
            }
            : undefined
        })
      );
    }
    return this.transporterPromise;
  }
}
