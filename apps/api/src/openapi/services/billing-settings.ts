import { billingTextFields } from "../../settings/service-billing/fields.js";
import { boolean, integer, object, ref, type Schema } from "./helpers.js";
const properties: Record<string, Schema> = Object.fromEntries(
  Object.entries(billingTextFields).map(([key, field]) => [
    key,
    {
      type: "string",
      maxLength: field.max,
      ...(field.required ? { minLength: 1 } : {}),
      description: `At most ${field.lines} line(s)`,
    },
  ]),
);
properties.showLogo = boolean;
properties.offerValidityDays = { ...integer, minimum: 1, maximum: 365 };
properties.paymentTermDays = { ...integer, minimum: 1, maximum: 365 };
properties.version = integer;
export const billingSettingsSchemas = {
  ServiceBillingSettings: object(properties),
};
function operation(write = false) {
  return {
    tags: ["Admin-Einstellungen"],
    operationId: write
      ? "AdminServiceBillingSettings_update"
      : "AdminServiceBillingSettings_get",
    ...(write
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: ref("ServiceBillingSettings") },
            },
          },
        }
      : {}),
    responses: {
      [write ? 201 : 200]: {
        description: "Versioned service billing settings",
        content: {
          "application/json": { schema: ref("ServiceBillingSettings") },
        },
      },
      400: { description: "Invalid or incomplete settings" },
      403: { description: "Admin role required" },
      ...(write ? { 409: { description: "Settings version is stale" } } : {}),
    },
  };
}
export const billingSettingsPaths = {
  "/admin/settings/service-billing": {
    get: operation(),
    post: operation(true),
  },
  "/services/billing-settings": {
    get: {
      ...operation(),
      tags: ["Dienste"],
      operationId: "Services_billing_settings",
      responses: {
        200: {
          description: "Billing settings for service PDF export",
          content: {
            "application/json": { schema: ref("ServiceBillingSettings") },
          },
        },
        403: { description: "Service management permission required" },
      },
    },
  },
};
