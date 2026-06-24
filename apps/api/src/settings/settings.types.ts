import type { NotificationTemplateKey } from "@prisma/client";

export type GeneralSettingsInput = { appName?: unknown; appSubtitle?: unknown; timezone?: unknown; newUserOrderNotificationsDefaultEnabled?: unknown };
export type AlertSettingsInput = { dailyDigestEnabled?: unknown; dailyDigestTime?: unknown; warningWindowDays?: unknown };
export type InventorySettingsInput = { enabled?: unknown; dailyReconcileTime?: unknown };
export type TemplateSettingsInput = { subjectTemplate?: unknown; introTemplate?: unknown; bodyTemplate?: unknown };
export type TemplateKey = NotificationTemplateKey;
