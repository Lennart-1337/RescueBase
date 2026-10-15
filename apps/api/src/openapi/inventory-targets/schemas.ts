const quantity = { type: "integer", minimum: 0, maximum: 2147483647 };
export const inventoryTargetSchemas = {
  InventoryTargetChange: {
    type: "object",
    required: ["articleId", "targetQuantity", "expectedTargetQuantity"],
    properties: {
      articleId: { type: "string", minLength: 1, maxLength: 191 },
      targetQuantity: { ...quantity, description: "0 removes the minimum target and cancels OPEN procurement orders." },
      expectedTargetQuantity: { ...quantity, nullable: true, description: "Previously loaded target quantity; null means no target exists." }
    }
  },
  BulkInventoryTargetRequest: {
    type: "object",
    required: ["locationId", "changes"],
    properties: {
      locationId: { type: "string", minLength: 1, maxLength: 191 },
      changes: { type: "array", minItems: 1, maxItems: 5000, items: { $ref: "#/components/schemas/InventoryTargetChange" } }
    }
  }
};
