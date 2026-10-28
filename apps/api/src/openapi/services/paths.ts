import { date, integer, object, ref, string, type Schema } from "./helpers.js";
const json = "application/json";
const query = (name: string) => ({
  name,
  in: "query",
  required: false,
  schema: { type: "string" },
});
const params = (names: string[]) =>
  names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
function operation(
  id: string,
  responseSchema: Schema,
  body?: Schema,
  names: string[] = [],
  queryNames: string[] = [],
  status = 200,
) {
  return {
    tags: ["Dienste"],
    operationId: `Services_${id}`,
    parameters: [...params(names), ...queryNames.map(query)],
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { [json]: { schema: body } },
          },
        }
      : {}),
    responses: {
      [status]: {
        description: "Successful service operation",
        content: { [json]: { schema: responseSchema } },
      },
      400: { description: "Invalid input or missing warning justification" },
      403: { description: "Service management permission required" },
      404: { description: "Record not found" },
      409: { description: "Stale version or read-only service" },
    },
  };
}
const filters = ["from", "to", "eventType", "customer"];
const list = (name: string) => ({ type: "array", items: ref(name) });
const resource = (name: string, schema: string) => ({
  [`/services/${name}`]: {
    post: operation(
      `create_${name}`,
      ref(schema),
      ref(`${schema}Write`),
      [],
      [],
      201,
    ),
  },
  [`/services/${name}/{id}`]: {
    put: operation(`update_${name}`, ref(schema), ref(`${schema}Write`), [
      "id",
    ]),
  },
});
export const servicePaths = {
  "/service-permissions/me": {
    get: operation("permission", ref("ServicePermission")),
  },
  "/service-permissions/users": {
    get: operation("permissions", list("ServicePermissionUser")),
  },
  "/service-permissions/users/{id}": {
    put: operation(
      "permission_update",
      ref("ServicePermission"),
      ref("ServicePermission"),
      ["id"],
    ),
  },
  "/services": {
    get: operation(
      "list",
      list("ServiceRecord"),
      undefined,
      [],
      [...filters, "status", "search"],
    ),
    post: operation(
      "create",
      ref("ServiceRecord"),
      ref("ServiceWrite"),
      [],
      [],
      201,
    ),
  },
  "/services/catalog": { get: operation("catalog", ref("ServiceCatalog")) },
  "/services/statistics": {
    get: operation(
      "statistics",
      ref("ServiceStatistics"),
      undefined,
      [],
      filters,
    ),
  },
  "/services/statistics.csv": {
    get: {
      ...operation("statistics_csv", {}, undefined, [], filters),
      responses: {
        200: {
          description: "CSV export",
          content: { "text/csv": { schema: { type: "string" } } },
        },
      },
    },
  },
  ...resource("people", "ServicePerson"),
  ...resource("vehicles", "ServiceVehicle"),
  ...resource("tariffs", "ServiceTariff"),
  ...resource("checklists", "ServiceChecklist"),
  "/services/{id}": {
    delete: operation("delete", object({ id: string, deletedAt: date, version: integer }),
      object({ version: integer }), ["id"]),
    get: operation("detail", ref("ServiceRecord"), undefined, ["id"]),
    put: operation("update", ref("ServiceRecord"), ref("ServiceUpdate"), [
      "id",
    ]),
  },
  "/services/{id}/transition": {
    post: operation(
      "transition",
      ref("ServiceRecord"),
      ref("ServiceTransition"),
      ["id"],
      [],
      201,
    ),
  },
  "/services/{id}/calculations": {
    post: operation(
      "calculation",
      ref("ServiceRecord"),
      ref("ServiceCalculationWrite"),
      ["id"],
      [],
      201,
    ),
  },
  "/services/{id}/documents": {
    get: operation("documents", list("ServiceDocument"), undefined, ["id"]),
    post: {
      ...operation(
        "upload",
        ref("ServiceDocument"),
        undefined,
        ["id"],
        [],
        201,
      ),
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file", "version"],
              properties: {
                file: { type: "string", format: "binary" },
                version: { type: "integer" },
              },
            },
          },
        },
      },
    },
  },
  "/services/{id}/documents/{documentId}": {
    get: {
      ...operation("download", {}, undefined, ["id", "documentId"]),
      responses: {
        200: {
          description: "Protected document",
          content: {
            "application/octet-stream": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        403: { description: "Service management permission required" },
        404: { description: "Document not found" },
      },
    },
  },
};
