import { rescueBaseOpenApiDocument } from "../src/openapi/document.js";

describe("service planning OpenAPI", () => {
  it("documents service lifecycle, catalogs, statistics and protected attachments", () => {
    const paths = rescueBaseOpenApiDocument.paths;
    expect(paths["/services"]?.post).toBeDefined();
    expect(paths["/services/{id}"]?.put).toBeDefined();
    expect(paths["/services/{id}"]?.delete).toBeDefined();
    expect(paths["/services/{id}/billing-status"]?.post).toBeDefined();
    expect(paths["/services/{id}/billing-documents"]?.post).toMatchObject({ responses: { 201: { content: { "application/pdf": { schema: { type: "string", format: "binary" } } } } } });
    expect(paths["/services/{id}/transition"]?.post).toBeDefined();
    expect(paths["/services/{id}/calculations"]?.post).toBeDefined();
    expect(paths["/services/statistics.csv"]?.get).toBeDefined();
    expect(paths["/services/{id}/documents/{documentId}"]?.get).toBeDefined();
    expect(paths["/service-permissions/users/{id}"]?.put).toBeDefined();
  });
  it("has concrete request schemas instead of arbitrary service payloads", () => {
    const schemas = rescueBaseOpenApiDocument.components!.schemas!;
    expect(schemas.ServiceWrite).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        assignments: {
          type: "array",
          items: { $ref: "#/components/schemas/ServiceAssignment" },
        },
        outcome: { $ref: "#/components/schemas/ServiceOutcome" },
      },
    });
    expect(schemas.ServiceUpdate).toMatchObject({ required: ["version"] });
    expect(schemas.ServicePermission).toMatchObject({
      required: ["servicesManage"],
    });
  });
});
