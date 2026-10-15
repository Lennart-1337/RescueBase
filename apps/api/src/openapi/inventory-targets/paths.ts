export const inventoryTargetPaths = {
  "/inventory/targets/bulk": {
    put: {
      tags: ["Lager"], operationId: "InventoryController_updateTargets",
      description: "Atomically saves minimum quantities for one location. Stale values cause a conflict without saving any changes.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/BulkInventoryTargetRequest" } } }
      },
      responses: {
        200: {
          description: "All inventory targets after saving",
          content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/InventoryTarget" } } } }
        },
        400: { description: "Invalid quantities, duplicate articles or inactive references" },
        409: { description: "A target changed since loading; no changes saved" }
      }
    }
  }
};
