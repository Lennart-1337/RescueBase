const object = (properties: object, required: string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
export const meierSearchSchemas = {
  MeierSearchRequest: object(
    {
      query: { type: "string", minLength: 2, maxLength: 120 },
      page: { type: "integer", minimum: 1, maximum: 10000, default: 1 },
    },
    ["query"],
  ),
  MeierSearchItem: object(
    {
      name: { type: "string" },
      url: { type: "string", format: "uri" },
      supplierArticleNumber: { type: "string" },
      manufacturer: { type: "string" },
      priceLabel: {
        type: "string",
        description:
          "Displayed shop price, possibly a starting price; final product preview supplies the import value.",
      },
    },
    ["name", "url"],
  ),
  MeierSearchResult: object(
    {
      query: { type: "string" },
      page: { type: "integer" },
      totalPages: { type: "integer" },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/MeierSearchItem" },
      },
      warnings: { type: "array", items: { type: "string" } },
    },
    ["query", "page", "totalPages", "items", "warnings"],
  ),
};
