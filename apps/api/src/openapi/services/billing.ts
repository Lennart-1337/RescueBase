import { integer, object, string } from "./helpers.js";
export const billingDocumentOperation = {
  tags: ["Dienste"],
  operationId: "Services_create_billing_document",
  parameters: [{ name: "id", in: "path", required: true, schema: string }],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: object({
          kind: { type: "string", enum: ["OFFER", "INVOICE"] },
          number: {
            type: "string",
            maxLength: 64,
            pattern: "^[A-Za-z0-9][A-Za-z0-9 ._-]*$",
          },
          issuedOn: { type: "string", format: "date" },
          recipient: {
            type: "string",
            maxLength: 500,
            description: "Postal recipient address, up to eight lines",
          },
          version: integer,
        }),
      },
    },
  },
  responses: {
    201: {
      description: "Archived PDF with immutable billing snapshot",
      content: {
        "application/pdf": { schema: { type: "string", format: "binary" } },
      },
    },
    400: {
      description:
        "Invalid input, cancelled service or missing actual attendance",
    },
    403: { description: "Service management permission required" },
    404: { description: "Service not found" },
    409: { description: "Stale version or document number already assigned" },
  },
};
