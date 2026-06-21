import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationTemplateKey } from "@prisma/client";
import { PrismaService } from "../persistence/prisma.service.js";
import { AuditService } from "../services/audit.service.js";
import { templateDefinitions, templateKeys } from "./template-definitions.js";
import { assertTemplatePlaceholders, renderNotificationTemplate } from "./template-renderer.js";
import type { TemplateSettingsInput } from "./settings.types.js";

@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list() {
    const rows = await Promise.all(templateKeys.map((key) => this.ensure(key)));
    return rows.map((row) => ({ ...row, allowedPlaceholders: templateDefinitions[row.key].allowedPlaceholders }));
  }

  async update(key: string, input: TemplateSettingsInput) {
    const templateKey = this.parseKey(key);
    const next = await this.draft(templateKey, input);
    const updated = await this.prisma.notificationTemplate.update({ where: { key: templateKey }, data: next });
    await this.audit.record({ actorType: "USER", actorLabel: "Admin", action: "NOTIFICATION_TEMPLATE_UPDATED", entityType: "NotificationTemplate", entityId: templateKey, payload: { key: templateKey } });
    return { ...updated, allowedPlaceholders: templateDefinitions[templateKey].allowedPlaceholders };
  }

  async preview(key: string, input: TemplateSettingsInput) {
    const templateKey = this.parseKey(key);
    return renderNotificationTemplate(await this.draft(templateKey, input), templateDefinitions[templateKey].sample);
  }

  async render(key: NotificationTemplateKey, values: Record<string, string>) {
    return renderNotificationTemplate(await this.ensure(key), values);
  }

  private async draft(key: NotificationTemplateKey, input: TemplateSettingsInput) {
    const current = await this.ensure(key);
    const draft = {
      key,
      subjectTemplate: templateText(input.subjectTemplate, current.subjectTemplate, 191),
      introTemplate: templateText(input.introTemplate, current.introTemplate, 4000),
      bodyTemplate: templateText(input.bodyTemplate, current.bodyTemplate, 12000)
    };
    if (/[\r\n]/.test(draft.subjectTemplate)) throw new BadRequestException("Betreff darf keine Zeilenumbrüche enthalten.");
    assertTemplatePlaceholders(draft);
    return draft;
  }

  private ensure(key: NotificationTemplateKey) {
    const defaults = templateDefinitions[key];
    return this.prisma.notificationTemplate.upsert({
      where: { key }, update: {},
      create: { key, subjectTemplate: defaults.subjectTemplate, introTemplate: defaults.introTemplate, bodyTemplate: defaults.bodyTemplate }
    });
  }

  private parseKey(key: string): NotificationTemplateKey {
    if (!templateKeys.includes(key as NotificationTemplateKey)) throw new NotFoundException("Benachrichtigungsvorlage nicht gefunden.");
    return key as NotificationTemplateKey;
  }
}

function templateText(value: unknown, fallback: string, maxLength: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException("Vorlagentexte dürfen nicht leer sein.");
  if (value.length > maxLength) throw new BadRequestException(`Vorlagentext darf höchstens ${maxLength} Zeichen enthalten.`);
  return value.trim();
}
