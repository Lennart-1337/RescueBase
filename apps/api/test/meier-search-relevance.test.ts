import { readFileSync } from "node:fs";
import { parseMeierSearch } from "../src/modules/catalog/meier-search/parser.js";
import { searchMeierArticles } from "../src/modules/catalog/meier-search/search.js";
const card = (
  name: string,
  sku: string,
  brand = "B. Braun",
  description = "",
) =>
  `<div class="product-box" data-product-information='${JSON.stringify({ sku, brand })}'><a class="productbox-name" href="https://www.meier-medizintechnik.de/product/${sku.replaceAll(" ", "-")}">${name}</a><div class="product-description">${description}</div></div>`;
const listing = (cards: string) =>
  `<div class="search-page"><h1 class="search-headline">Suche</h1><div data-listing>${cards}</div><div class="pagination"><a class="page-link" data-page="9"></a></div></div>`;
const cannula = card(
  "B. Braun Venenverweilkanülen | grün | 18G",
  "425 100",
  "B. Braun Melsungen AG",
);
describe("Meier search relevance", () => {
  it("filters actual supplier cards and retains original cannula SKU values", () => {
    const html = readFileSync(
      new URL(
        "./fixtures/meier-search/cannula-with-unrelated.html",
        import.meta.url,
      ),
    );
    const result = parseMeierSearch(html, "Braunüle", 1);
    expect(result.items.map((item) => item.supplierArticleNumber)).toEqual([
      "DIS 4820",
      "DIS 4814",
      "DIS 4817",
    ]);
    expect(result.totalPages).toBe(3);
    expect(
      parseMeierSearch(html, "Braunüle weiss 17G", 1).items.map(
        (item) => item.supplierArticleNumber,
      ),
    ).toEqual(["DIS 4817"]);
  });
  it("does not admit a partial SKU match when another query qualifier is missing", () => {
    expect(parseMeierSearch(listing(cannula), "425-100 blau", 1).items).toEqual(
      [],
    );
  });
  it.each([
    "Braunüle",
    "BRAUNÜLEN",
    "Braunuele",
    "braunuelen",
    "Braunu\u0308le",
  ])("expands %s and removes unrelated bags and boots", (query) => {
    const html = listing(
      cannula +
        card(
          "Notfallrucksack First Responder",
          "SET01",
          "Meier",
          "Venenverweilkanüle",
        ) +
        card("HAIX Black Eagle Brown", "330014", "HAIX GmbH"),
    );
    const result = parseMeierSearch(html, query, 1);
    expect(result.items.map((item) => item.supplierArticleNumber)).toEqual([
      "425 100",
    ]);
    expect(result.query).toBe(query);
    expect(result.totalPages).toBe(9);
    expect(result.warnings.join(" ")).toContain("Venenverweilkanüle");
    expect(result.warnings.join(" ")).toContain("2");
  });
  it("requires every qualifier and folds accents and sharp s", () => {
    const result = parseMeierSearch(
      listing(cannula + card("Venenverweilkanüle blau 22G", "425-200")),
      "Braunüle grun 18G",
      1,
    );
    expect(result.items).toHaveLength(1);
    expect(
      parseMeierSearch(
        listing(card("Straße Verband Größe 4", "9310910")),
        "Strasse Grosse 4",
        1,
      ).items,
    ).toHaveLength(1);
  });
  it("matches short brand tokens exactly, excluding Brown and GmbH", () => {
    expect(
      parseMeierSearch(
        listing(cannula + card("HAIX Brown", "330014", "HAIX GmbH")),
        "B. Braun",
        1,
      ).items.map((item) => item.supplierArticleNumber),
    ).toEqual(["425 100"]);
  });
  it.each(["425-100", "425/100", "425 100", "425100"])(
    "normalizes SKU punctuation in %s while preserving the source number",
    (query) => {
      expect(
        parseMeierSearch(listing(cannula), query, 1).items[0]
          ?.supplierArticleNumber,
      ).toBe("425 100");
    },
  );
  it("does not expand substrings or unrelated medical terms", async () => {
    const request = async (input: URL | RequestInfo) => {
      expect(new URL(String(input)).searchParams.get("search")).toBe(
        "Braunülenhalter Kanüle",
      );
      return new Response(listing(card("Braunülenhalter Kanüle", "OTHER")), {
        headers: { "content-type": "text/html" },
      });
    };
    await searchMeierArticles({ query: "Braunülenhalter Kanüle" }, request);
  });
  it("sends the expanded query on either page but keeps the original query", async () => {
    for (const page of [1, 2]) {
      const request = async (input: URL | RequestInfo) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("search")).toBe(
          "Venenverweilkanüle grün 18G",
        );
        expect(url.searchParams.get("p")).toBe(String(page));
        return new Response(listing(cannula), {
          headers: { "content-type": "text/html" },
        });
      };
      const result = await searchMeierArticles(
        { query: "Braunüle grün 18G", page },
        request,
      );
      expect(result.query).toBe("Braunüle grün 18G");
      expect(result.page).toBe(page);
      expect(result.items).toHaveLength(1);
    }
  });
  it("validates redirects against the expanded query", async () => {
    const location =
      "https://www.meier-medizintechnik.de/widgets/search?search=Venenverweilkan%C3%BCle&p=2";
    let calls = 0;
    const result = await searchMeierArticles(
      { query: "Braunüle", page: 2 },
      async () =>
        ++calls === 1
          ? new Response(null, { status: 302, headers: { location } })
          : new Response(listing(cannula), {
              headers: { "content-type": "text/html" },
            }),
    );
    expect(result.items).toHaveLength(1);
    await expect(
      searchMeierArticles(
        { query: "Braunüle", page: 2 },
        async () =>
          new Response(null, {
            status: 302,
            headers: {
              location: location.replace(
                "Venenverweilkan%C3%BCle",
                "Braun%C3%BCle",
              ),
            },
          }),
      ),
    ).rejects.toThrow();
  });
});
