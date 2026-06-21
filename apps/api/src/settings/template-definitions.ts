import type { NotificationTemplateKey } from "@prisma/client";

export type TemplateDefinition = {
  allowedPlaceholders: string[];
  bodyTemplate: string;
  ctaLabel: string;
  introTemplate: string;
  sample: Record<string, string>;
  subjectTemplate: string;
  title: string;
};

export const templateKeys: NotificationTemplateKey[] = ["ALERT_IMMEDIATE", "ALERT_DIGEST", "NEW_ORDER"];

export const templateDefinitions: Record<NotificationTemplateKey, TemplateDefinition> = {
  ALERT_IMMEDIATE: {
    allowedPlaceholders: ["recipientName", "title", "category", "dueDate", "details", "detailsUrl"],
    subjectTemplate: "RescueBase Warnung · {{title}}",
    introTemplate: "Hallo {{recipientName}}, für Ihre Organisation wurde eine neue Warnung erkannt.",
    bodyTemplate: "{{title}}\nKategorie: {{category}}\nFällig: {{dueDate}}\n{{details}}",
    title: "Neue Warnung",
    ctaLabel: "Warnung ansehen",
    sample: { recipientName: "Lager Nord", title: "Ablaufwarnung: Verbandpäckchen", category: "Ablauf", dueDate: "01.07.2026", details: "3 Verbandpäckchen laufen bald ab.", detailsUrl: "https://rescuebase.local/admin/inventory?warning=expiry" }
  },
  ALERT_DIGEST: {
    allowedPlaceholders: ["recipientName", "warningCount", "warnings", "detailsUrl"],
    subjectTemplate: "RescueBase Tagesdigest · {{warningCount}} Warnungen",
    introTemplate: "Hallo {{recipientName}}, hier ist die aktuelle Übersicht Ihrer offenen RescueBase-Warnungen.",
    bodyTemplate: "{{warnings}}",
    title: "Täglicher Warnungsdigest",
    ctaLabel: "Warnungen ansehen",
    sample: { recipientName: "Lager Nord", warningCount: "2", warnings: "[Ablauf] Verbandpäckchen · Fällig: 01.07.2026\n[STK] Defibrillator · Fällig: 10.07.2026", detailsUrl: "https://rescuebase.local/admin/inventory?warning=expiry" }
  },
  NEW_ORDER: {
    allowedPlaceholders: ["orderId", "kitName", "kitCode", "locationName", "createdAt", "items", "detailsUrl"],
    subjectTemplate: "RescueBase Nachfüllauftrag {{kitName}}",
    introTemplate: "Für {{kitName}} wurde ein neuer Nachfüllauftrag erstellt.",
    bodyTemplate: "Standort: {{locationName}}\nRucksackcode: {{kitCode}}\nAuftrag: {{orderId}}\n{{items}}",
    title: "Neuer Nachfüllauftrag",
    ctaLabel: "Aufträge ansehen",
    sample: { orderId: "order-demo", kitName: "Notfallrucksack 1", kitCode: "NFR-001", locationName: "Hauptlager", createdAt: "21.06.2026, 09:30", items: "2 Stück Verbandpäckchen (Fehlbestand)", detailsUrl: "https://rescuebase.local/" }
  }
};
