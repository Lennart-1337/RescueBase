import { BadGatewayException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { parseMeierSearch } from "../src/modules/catalog/meier-search/parser.js";
import { searchMeierArticles } from "../src/modules/catalog/meier-search/search.js";

const listing = (content: string) =>
  `<div class="cms-element-product-listing-wrapper" data-listing="true">${content}</div>`;
const product = `<div class="product-box" data-product-information='{"sku":"ABC-1"}'><a class="productbox-name" href="https://www.meier-medizintechnik.de/ambu-beutel/abc-1">Ambu Beutel</a></div>`;

describe("Meier storefront search widget", () => {
  it("parses captured anonymous AJAX responses including empty results", () => {
    const fixture = (name: string) =>
      readFileSync(
        new URL(`./fixtures/meier-search/widget-${name}.html`, import.meta.url),
      );
    const result = parseMeierSearch(fixture("ambu"), "Ambu", 1);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].supplierArticleNumber).toBeTruthy();
    expect(result.totalPages).toBeGreaterThan(1);
    expect(parseMeierSearch(fixture("empty"), "unknown", 1).items).toEqual([]);
  });

  it("reads the standalone listing fragment used by the shop's AJAX search", () => {
    const result = parseMeierSearch(
      listing(product + '<a class="page-link" data-page="3"></a>') +
        `<aside>${product.replace("Ambu Beutel", "Ambu Empfehlung")}</aside>`,
      "Ambu",
      2,
    );
    expect(result.items.map((item) => item.name)).toEqual(["Ambu Beutel"]);
    expect(result.totalPages).toBe(3);
  });

  it("accepts a genuine empty widget but rejects missing or malformed listings", () => {
    expect(
      parseMeierSearch(
        listing(
          '<div class="alert-content-container">Keine Produkte gefunden.</div>',
        ),
        "unknown",
        1,
      ).items,
    ).toEqual([]);
    for (const html of [
      listing(""),
      `<div data-listing>${product}</div>`,
      "<h1>Login</h1>",
    ])
      expect(() => parseMeierSearch(html, "Ambu", 1)).toThrow(
        BadGatewayException,
      );
  });

  it("uses the anonymous widget endpoint without credentials or an API key", async () => {
    const request: typeof fetch = async (input, options) => {
      expect(new URL(String(input)).pathname).toBe("/widgets/search");
      expect(options?.credentials).toBe("omit");
      expect(new Headers(options?.headers).has("sw-access-key")).toBe(false);
      return new Response(listing(product), {
        headers: { "content-type": "text/html" },
      });
    };
    expect(
      (await searchMeierArticles({ query: "Ambu" }, request)).items,
    ).toHaveLength(1);
  });

  it("rejects redirects to the full page, suggestions or altered query parameters", async () => {
    for (const path of [
      "/search?search=Ambu&p=1",
      "/suggest?search=Ambu&p=1",
      "/widgets/search?search=Ambu&p=2",
      "/widgets/search?search=Ambu&p=1&extra=1",
    ])
      await expect(
        searchMeierArticles(
          { query: "Ambu" },
          async () =>
            new Response(null, { status: 302, headers: { location: path } }),
        ),
      ).rejects.toThrow(BadGatewayException);
  });
});
