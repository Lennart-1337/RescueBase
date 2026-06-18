import type { AlertWarning } from "../alerts/alert-engine.js";
import { renderCodeBlock, renderList, renderMailLayout } from "./mail-layout.js";

export interface MailContent {
  debugCode?: string;
  debugUrl?: string;
  html?: string;
  subject: string;
  text: string;
}

export function buildInvitationMail(invitationUrl: string): MailContent {
  return {
    subject: "RescueBase Einladung",
    text: `Sie wurden zu RescueBase eingeladen.\n\nEinladung öffnen: ${invitationUrl}\n`,
    html: renderMailLayout({
      title: "Einladung zu RescueBase",
      intro: "Sie wurden zu RescueBase eingeladen und können Ihr Konto jetzt einrichten.",
      bodyHtml: "<p style=\"margin:0;color:#657386;line-height:1.6;\">Öffnen Sie den Einladungslink und vergeben Sie dort Ihr persönliches Passwort.</p>",
      ctaLabel: "Einladung öffnen",
      ctaUrl: invitationUrl
    }),
    debugUrl: invitationUrl
  };
}

export function buildPasswordResetMail(resetUrl: string): MailContent {
  return {
    subject: "RescueBase Passwort zurücksetzen",
    text: `Setzen Sie Ihr RescueBase-Passwort zurück.\n\nLink: ${resetUrl}\n`,
    html: renderMailLayout({
      title: "Passwort zurücksetzen",
      intro: "Für Ihr RescueBase-Konto wurde ein Passwort-Reset angefordert.",
      bodyHtml: "<p style=\"margin:0;color:#657386;line-height:1.6;\">Wenn Sie das waren, öffnen Sie bitte den Link unten. Falls nicht, können Sie diese E-Mail ignorieren.</p>",
      ctaLabel: "Passwort zurücksetzen",
      ctaUrl: resetUrl
    }),
    debugUrl: resetUrl
  };
}

export function buildEmailTwoFactorCodeMail(code: string): MailContent {
  return {
    subject: "RescueBase Sicherheitscode",
    text: `Ihr RescueBase-Sicherheitscode lautet: ${code}\n`,
    html: renderMailLayout({
      title: "Sicherheitscode",
      intro: "Verwenden Sie diesen Code, um Ihre Anmeldung in RescueBase abzuschließen.",
      bodyHtml: `${renderCodeBlock(code)}<p style="margin:16px 0 0;color:#657386;line-height:1.6;">Der Code ist nur kurz gültig und sollte nicht weitergegeben werden.</p>`
    }),
    debugCode: code
  };
}

export function buildAlertMail(subject: string, warnings: AlertWarning[], detailsUrl: string): MailContent {
  const lines = warnings.map((warning) => `${warning.title} (${warning.locationName ?? "ohne Standort"}) · Fällig: ${warning.dueAt.slice(0, 10)}`);
  return {
    subject,
    text: ["RescueBase Warnung", "", ...lines.map((line) => `- ${line}`), "", `Details: ${detailsUrl}`].join("\n"),
    html: renderMailLayout({
      title: "Warnungen im Bestand",
      intro: "Für Ihre Organisation gibt es fällige oder bald fällige Prüf- und Bestandswarnungen.",
      bodyHtml: renderList(lines),
      ctaLabel: "Warnungen ansehen",
      ctaUrl: detailsUrl
    }),
    debugUrl: detailsUrl
  };
}
