import type { AlertWarning } from "../alerts/alert-engine.js";
import { renderCodeBlock, renderList, renderMailLayout } from "./mail-layout.js";

export interface MailContent {
  debugCode?: string;
  debugUrl?: string;
  html?: string;
  subject: string;
  text: string;
}

export type ImmediateAlertMail = {
  category: string;
  details: string;
  dueAt: Date | null;
  recipientName: string;
  title: string;
};

export type AlertDigestMail = {
  recipientName: string;
  warnings: Array<{
    category: string;
    dueAt: Date | null;
    locationName: string | null;
    title: string;
  }>;
};

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

export function buildEmailChangeConfirmationMail(changeUrl: string): MailContent {
  return {
    subject: "RescueBase E-Mail-Adresse bestätigen",
    text: `Bestätigen Sie die neue E-Mail-Adresse für Ihr RescueBase-Konto.\n\nLink: ${changeUrl}\n`,
    html: renderMailLayout({
      title: "Neue E-Mail-Adresse bestätigen",
      intro: "Ein Admin hat für Ihr RescueBase-Konto eine neue E-Mail-Adresse hinterlegt.",
      bodyHtml: "<p style=\"margin:0;color:#657386;line-height:1.6;\">Bestätigen Sie die Adresse, damit sie künftig für die Anmeldung verwendet wird. Der Link ist 24 Stunden gültig.</p>",
      ctaLabel: "E-Mail-Adresse bestätigen",
      ctaUrl: changeUrl
    }),
    debugUrl: changeUrl
  };
}

export function buildEmailChangeCompletedMail(newEmail: string): MailContent {
  return {
    subject: "RescueBase E-Mail-Adresse geändert",
    text: `Die E-Mail-Adresse Ihres RescueBase-Kontos wurde in ${newEmail} geändert. Falls Sie diese Änderung nicht erwarten, wenden Sie sich bitte an einen Admin.\n`,
    html: renderMailLayout({
      title: "E-Mail-Adresse geändert",
      intro: "Die E-Mail-Adresse Ihres RescueBase-Kontos wurde geändert.",
      bodyHtml: `<p style="margin:0;color:#657386;line-height:1.6;">Die neue Anmeldeadresse lautet <strong>${newEmail}</strong>. Falls Sie diese Änderung nicht erwarten, wenden Sie sich bitte an einen Admin.</p>`
    })
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

export function buildImmediateAlertMail(alert: ImmediateAlertMail, detailsUrl: string): MailContent {
  return {
    subject: `RescueBase Warnung · ${alert.title}`,
    text: [
      `Hallo ${alert.recipientName},`,
      "",
      "eine neue RescueBase-Warnung wurde erkannt:",
      `- ${alert.title}`,
      `- Kategorie: ${formatCategory(alert.category)}`,
      `- Fällig: ${formatDueDate(alert.dueAt)}`,
      `- Details: ${alert.details}`,
      "",
      `Details: ${detailsUrl}`
    ].join("\n"),
    html: renderMailLayout({
      title: "Neue Warnung",
      intro: `Hallo ${alert.recipientName}, für Ihre Organisation wurde eine neue Warnung erkannt.`,
      bodyHtml: [
        renderList([
          alert.title,
          `Kategorie: ${formatCategory(alert.category)}`,
          `Fällig: ${formatDueDate(alert.dueAt)}`,
          alert.details
        ])
      ].join(""),
      ctaLabel: "Warnung ansehen",
      ctaUrl: detailsUrl
    }),
    debugUrl: detailsUrl
  };
}

export function buildAlertDigestMail(digest: AlertDigestMail, detailsUrl: string): MailContent {
  const lines = digest.warnings.map((warning) =>
    `[${formatCategory(warning.category)}] ${warning.title} (${warning.locationName ?? "ohne Standort"}) · Fällig: ${formatDueDate(warning.dueAt)}`
  );
  return {
    subject: `RescueBase Tagesdigest · ${digest.warnings.length} Warnungen`,
    text: [
      `Hallo ${digest.recipientName},`,
      "",
      "hier ist Ihr täglicher RescueBase-Digest:",
      ...lines.map((line) => `- ${line}`),
      "",
      `Details: ${detailsUrl}`
    ].join("\n"),
    html: renderMailLayout({
      title: "Täglicher Warnungsdigest",
      intro: `Hallo ${digest.recipientName}, hier ist die aktuelle Übersicht Ihrer offenen RescueBase-Warnungen.`,
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

function formatCategory(category: string) {
  if (category === "EXPIRY") return "Ablauf";
  if (category === "STK_DUE") return "STK";
  if (category === "MTK_DUE") return "MTK";
  if (category === "SHORTAGE") return "Fehlbestand";
  return category;
}

function formatDueDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "sofort";
}
