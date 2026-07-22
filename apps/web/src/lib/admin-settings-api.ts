import { openApiClient } from "./openapi-client";
import type { NotificationTemplateKey } from "./admin-settings-types";
import type { components } from "./generated-api";

type GeneralInput = components["schemas"]["UpdateGeneralSettingsRequest"];
type AlertInput = components["schemas"]["UpdateAlertSettingsRequest"];
type InventoryInput = components["schemas"]["UpdateAdminInventorySettingsRequest"];
type TemplateInput = components["schemas"]["UpdateNotificationTemplateRequest"];

export const adminSettingsApi = {
  adminSettings: () => openApiClient.get("/admin/settings"),
  updateGeneralSettings: (body: GeneralInput) => openApiClient.post("/admin/settings/general", body),
  updateAlertSettings: (body: AlertInput) => openApiClient.post("/admin/settings/alerts", body),
  runDailyDigest: () => openApiClient.post("/admin/settings/alerts/digest"),
  updateAdminInventorySettings: (body: InventoryInput) => openApiClient.post("/admin/settings/inventory", body),
  updateNotificationTemplate: (key: NotificationTemplateKey, body: TemplateInput) =>
    openApiClient.post("/admin/settings/templates/{key}", body, { params: { key } }),
  previewNotificationTemplate: (key: NotificationTemplateKey, body: TemplateInput) =>
    openApiClient.post("/admin/settings/templates/{key}/preview", body, { params: { key } })
};
