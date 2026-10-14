import { ref } from "./helpers.js";
const json = "application/json";

export const meierReconciliationPaths = {
  "/catalog/articles/{id}/meier-preview": {
    post: operation(
      "Stammdaten",
      "CatalogArticleReconciliationController_preview",
      pathParam("id"),
      response(
        201,
        "Existing article and supplier preview",
        ref("MeierReconciliationPreview"),
      ),
    ),
  },
  "/catalog/articles/{id}/meier-apply": {
    post: operation(
      "Stammdaten",
      "CatalogArticleReconciliationController_apply",
      { ...pathParam("id"), ...request("MeierReconciliationApplyRequest") },
      {
        responses: {
          201: {
            description: "Selected changes applied",
            content: { [json]: { schema: ref("OkResponse") } },
          },
          409: {
            description:
              "Article changed since preview; fetch a new preview before applying",
          },
        },
      },
    ),
  },
};

function pathParam(name: string) {
  return {
    parameters: [
      { name, in: "path", required: true, schema: { type: "string" } },
    ],
  };
}
function request(name: string) {
  return {
    requestBody: { required: true, content: { [json]: { schema: ref(name) } } },
  };
}
function response(status: number, description: string, schema: object) {
  return {
    responses: { [status]: { description, content: { [json]: { schema } } } },
  };
}
function operation(
  tag: string,
  operationId: string,
  input: object,
  output: object,
) {
  return { tags: [tag], operationId, ...input, ...output };
}
