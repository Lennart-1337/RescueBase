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

export function buildNewOrderMail(order: {
  id: string;
  createdAt: Date;
  items: Array<{ articleName: string; quantity: number; reason: string; unit: string }>;
  kitCode: string;
  kitName: string;
  locationName: string;
}, detailsUrl: string): MailContent {
  const lines = order.items.map((item) => `${item.quantity} ${item.unit} ${item.articleName} (${formatReason(item.reason)})`);
  return {
    subject: `RescueBase Nachfüllauftrag ${order.kitName}`,
    text: [
      "Ein neuer Nachfüllauftrag wurde erstellt.",
      "",
      `Auftrag: ${order.id}`,
      `Rucksack: ${order.kitName} (${order.kitCode})`,
      `Standort: ${order.locationName}`,
      `Erstellt: ${order.createdAt.toISOString()}`,
      "",
      ...lines.map((line) => `- ${line}`),
      "",
      `Details: ${detailsUrl}`
    ].join("\n"),
    html: renderMailLayout({
      title: "Neuer Nachfüllauftrag",
      intro: `Für ${order.kitName} wurde ein neuer Nachfüllauftrag erstellt.`,
      bodyHtml: [
        `<p style="margin:0 0 12px;color:#657386;line-height:1.6;">Standort: ${order.locationName}<br/>Rucksackcode: ${order.kitCode}<br/>Auftrag: ${order.id}</p>`,
        renderList(lines)
      ].join(""),
      ctaLabel: "Aufträge ansehen",
      ctaUrl: detailsUrl
    }),
    debugUrl: detailsUrl
  };
}

function formatReason(reason: string) {
  if (reason === "DISCARDED_EXPIRED") return "Ablauf entsorgt";
  if (reason === "SHORTAGE_AND_DISCARDED_EXPIRED") return "Fehlbestand und Ablauf";
  return "Fehlbestand";
}
