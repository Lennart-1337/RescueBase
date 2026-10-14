import "reflect-metadata";
import { REQUIRED_ROLES, RATE_LIMIT } from "../src/auth/auth.decorators.js";
import { CatalogArticleImportController } from "../src/modules/catalog/article-import.controller.js";
import { rescueBaseOpenApiDocument } from "../src/openapi/document.js";
describe("supplier preview API contract", () => {
  it("restricts supplier loading to administrators and limits requests", () => {
    expect(
      Reflect.getMetadata(REQUIRED_ROLES, CatalogArticleImportController),
    ).toEqual(["ADMIN"]);
    expect(
      Reflect.getMetadata(
        RATE_LIMIT,
        CatalogArticleImportController.prototype.importPreview,
      ),
    ).toEqual({ limit: 10, windowMs: 60_000 });
  });
  it("documents preview and supplier article numbers independently", () => {
    expect(
      rescueBaseOpenApiDocument.paths["/catalog/articles/import-preview"]?.post
        ?.operationId,
    ).toBe("CatalogArticleImportController_importPreview");
    const schemas = rescueBaseOpenApiDocument.components?.schemas;
    for (const name of [
      "Article",
      "CreateArticleRequest",
      "UpdateArticleRequest",
    ]) {
      expect(schemas?.[name]).toMatchObject({
        properties: { supplierArticleNumber: { type: "string" } },
      });
    }
  });
});
