export const meierSearchPaths = {
  "/catalog/articles/meier-search": {
    post: {
      tags: ["Stammdaten"],
      operationId: "CatalogMeierSearchController_search",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MeierSearchRequest" },
          },
        },
      },
      responses: {
        201: {
          description: "Paginated public Meier store search results",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MeierSearchResult" },
            },
          },
        },
        400: { description: "Invalid search query or page" },
        502: { description: "Supplier search response unavailable or invalid" },
        504: { description: "Supplier request timed out" },
      },
    },
  },
};
