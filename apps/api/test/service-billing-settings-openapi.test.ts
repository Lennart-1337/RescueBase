import { rescueBaseOpenApiDocument } from "../src/openapi/document.js";
describe("billing settings OpenAPI", () => {
  it("documents admin writes and read-only service access with one versioned schema", () => {
    expect(rescueBaseOpenApiDocument.paths["/admin/settings/service-billing"]?.post).toMatchObject({ responses: { 409: { description: "Settings version is stale" } } });
    expect(rescueBaseOpenApiDocument.paths["/admin/settings/service-billing"]?.get).toBeDefined();
    expect(rescueBaseOpenApiDocument.paths["/services/billing-settings"]?.get).toBeDefined();
    expect(rescueBaseOpenApiDocument.paths["/services/billing-settings"]?.post).toBeUndefined();
    expect(rescueBaseOpenApiDocument.components?.schemas?.ServiceBillingSettings).toMatchObject({
      type: "object", additionalProperties: false, required: expect.arrayContaining(["organizationName", "street", "iban", "version"]), properties: { offerValidityDays: { minimum: 1, maximum: 365 }, version: { type: "integer", minimum: 0 } },
    });
  });
});
