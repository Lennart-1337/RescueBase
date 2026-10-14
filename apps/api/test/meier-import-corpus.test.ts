import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { CatalogArticleImportController } from "../src/modules/catalog/article-import.controller.js";

const cases = JSON.parse(
  readFileSync(
    new URL("./fixtures/meier/regression-cases.json", import.meta.url),
    "utf8",
  ),
) as Array<{
  fixture: string;
  data: Record<string, unknown> & { articleUrl: string };
}>;
afterEach(() => jest.restoreAllMocks());
describe("Meier captured product page regression corpus", () => {
  it.each(cases)(
    "imports the complete reviewed field set for $fixture",
    async ({ fixture, data }) => {
      const body = readFileSync(
        new URL(`./fixtures/meier/${fixture}.html`, import.meta.url),
      );
      const request = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(body, {
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
        );
      const result = await new CatalogArticleImportController().importPreview({
        url: data.articleUrl,
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0]?.[0].toString()).toBe(data.articleUrl);
      expect(
        Object.fromEntries(
          Object.entries(result.data).filter(
            ([, value]) => value !== undefined,
          ),
        ),
      ).toStrictEqual(data);
      expect(result).toMatchObject({
        source: "MEIER_MEDIZINTECHNIK",
        sourceUrl: data.articleUrl,
        supplierName: "Meier Medizintechnik",
      });
      if (!data.unitsPerPackage)
        expect(result.warnings.join(" ")).toContain("VE");
    },
  );
});
