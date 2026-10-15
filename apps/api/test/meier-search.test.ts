import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { parseMeierSearch } from "../src/modules/catalog/meier-search/parser.js";
import { searchMeierArticles } from "../src/modules/catalog/meier-search/search.js";
const url = "https://www.meier-medizintechnik.de/test-product/ABC-1";
const page = `<div class="search-page"><h1 class="search-headline">Suchergebnisse</h1><div data-listing><div class="product-box" data-product-information='{"sku":"ABC-1","brand":"Ambu"}'><a class="productbox-name" href="${url}">Ambu® Beutel</a><span class="product-price">ab 12,50 €*</span></div></div><ul class="pagination"><li class="page-last"><a class="page-link" data-page="7"></a></li></ul></div>`;
describe("Meier shop search", () => {
  it("reads visible product names, identifiers, prices and last page", () => {
    expect(parseMeierSearch(page, "ambu", 1)).toEqual({
      query: "ambu",
      page: 1,
      totalPages: 7,
      items: [
        {
          name: "Ambu® Beutel",
          url,
          supplierArticleNumber: "ABC-1",
          manufacturer: "Ambu",
          priceLabel: "ab 12,50 €*",
        },
      ],
      warnings: [],
    });
  });
  it("recognizes empty listings without suggesting unrelated cards", () => {
    expect(
      parseMeierSearch(
        '<div class="search-page"><h1 class="search-headline">Suche</h1><div data-listing><div class="alert-content-container">Keine Produkte gefunden.</div></div></div><div class="product-box">Empfehlung</div>',
        "leer",
        1,
      ).items,
    ).toEqual([]);
  });
  it("rejects blocked and unexpectedly empty pages", () => {
    for (const html of [
      "<h1>Challenge</h1>",
      '<div class="search-page"></div>',
    ])
      expect(() => parseMeierSearch(html, "ambu", 1)).toThrow(
        BadGatewayException,
      );
  });
  it("skips unsafe results visibly and deduplicates products", () => {
    const html = page.replace(
      "</div></div><ul",
      `<div class="product-box"><a class="productbox-name" href="https://evil.example/x">Unsafe</a></div><div class="product-box"><a class="productbox-name" href="${url}">Duplicate</a></div></div></div><ul`,
    );
    const result = parseMeierSearch(html, "ambu", 1);
    expect(result.items).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
  it("encodes query parameters and only requests one requested page", async () => {
    const calls: URL[] = [];
    const result = await searchMeierArticles(
      { query: "  Ambu & blau  ", page: 2 },
      async (input, options) => {
        calls.push(new URL(String(input)));
        expect(new Headers(options?.headers).get("X-Requested-With")).toBe(
          "XMLHttpRequest",
        );
        return new Response(page, { headers: { "content-type": "text/html" } });
      },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].hostname).toBe("www.meier-medizintechnik.de");
    expect(calls[0].pathname).toBe("/widgets/search");
    expect(calls[0].searchParams.get("search")).toBe("Ambu & blau");
    expect(calls[0].searchParams.get("p")).toBe("2");
    expect(result.page).toBe(2);
  });
  it("validates input before contacting the supplier", async () => {
    for (const body of [
      { query: "a" },
      { query: "a".repeat(121) },
      { query: 2 },
      { query: "ambu", page: 0 },
      { query: "ambu", page: 1.5 },
      { query: "ambu", page: "2" },
      { query: "ambu", page: 10001 },
    ])
      await expect(searchMeierArticles(body)).rejects.toThrow(
        BadRequestException,
      );
  });
  it("rejects redirects outside the exact supplier search and query", async () => {
    for (const target of [
      "https://evil.example/search",
      "https://www.meier-medizintechnik.de/account",
      "https://www.meier-medizintechnik.de/search?search=other&p=1",
    ])
      await expect(
        searchMeierArticles(
          { query: "ambu" },
          async () =>
            new Response(null, { status: 302, headers: { location: target } }),
        ),
      ).rejects.toThrow();
  });
});
