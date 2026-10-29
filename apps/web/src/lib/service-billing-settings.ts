import { openApiClient } from "./openapi-client";
import type { components } from "./generated-api";
export type ServiceBillingSettings = components["schemas"]["ServiceBillingSettings"];
export const billingSettingsKey = ["settings", "service-billing"] as const;
export const getServiceBillingSettings = () => openApiClient.get("/admin/settings/service-billing");
export const saveServiceBillingSettings = (body: ServiceBillingSettings) => openApiClient.post("/admin/settings/service-billing", body);
