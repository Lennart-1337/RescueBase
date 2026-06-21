import type { NotificationTemplateKey } from "@prisma/client";
import { BadRequestException } from "@nestjs/common";
import { escapeHtml, renderMailLayout } from "../services/mail-layout.js";
import { templateDefinitions } from "./template-definitions.js";

export type StoredTemplate = { key: NotificationTemplateKey; subjectTemplate: string; introTemplate: string; bodyTemplate: string };

export function assertTemplatePlaceholders(template: StoredTemplate): void {
  const allowed = new Set(templateDefinitions[template.key].allowedPlaceholders);
  for (const field of [template.subjectTemplate, template.introTemplate, template.bodyTemplate]) {
    for (const match of field.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
      const placeholder = match[1] ?? "";
      if (!allowed.has(placeholder)) throw new BadRequestException(`Platzhalter {{${placeholder}}} ist für ${template.key} nicht erlaubt.`);
    }
    if (field.includes("{{") && !/{{\s*[^{}]+?\s*}}/.test(field)) throw new BadRequestException("Platzhalter-Syntax ist ungültig.");
  }
}

export function renderNotificationTemplate(template: StoredTemplate, values: Record<string, string>) {
  const definition = templateDefinitions[template.key];
  const render = (value: string) => value.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => values[key] ?? "");
  const subject = render(template.subjectTemplate);
  const intro = render(template.introTemplate);
  const body = render(template.bodyTemplate);
  const text = [intro, "", body, "", values.detailsUrl ? `Details: ${values.detailsUrl}` : ""].filter(Boolean).join("\n");
  const bodyHtml = `<p style="margin:0;color:#657386;line-height:1.6;">${escapeHtml(body).replaceAll("\n", "<br/>")}</p>`;
  return {
    subject,
    text,
    html: renderMailLayout({ title: definition.title, intro: escapeHtml(intro), bodyHtml, ctaLabel: definition.ctaLabel, ctaUrl: values.detailsUrl })
  };
}
