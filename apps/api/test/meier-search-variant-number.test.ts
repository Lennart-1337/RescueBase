import { selectMeierVariant } from "../src/modules/catalog/meier-search/variant.js";
import { readFileSync } from "node:fs";
import { parseMeierSearch } from "../src/modules/catalog/meier-search/parser.js";
const html = `<div class="search-page"><h1 class="search-headline">Suche</h1><div data-listing><div class="product-box" data-product-information='{"sku":"IDEALAST-GROUP","brand":"Hartmann"}'><a class="productbox-name" href="https://www.meier-medizintechnik.de/hartmann-idealast-haft/9310910">Hartmann Idealast blau</a></div><div class="product-box" data-product-information='{"sku":"MASK-GROUP","brand":"Ambu"}'><a class="productbox-name" href="https://www.meier-medizintechnik.de/ambu-mask/330-023-000">Ambu Maske</a></div></div></div>`;
describe("Meier search variant article numbers", () => {
  it("does not select unsafe or ambiguous configurator links or guess partial matches", () => {
    const defaultUrl = "https://www.meier-medizintechnik.de/hartmann/9310900";
    const link = "https://www.meier-medizintechnik.de/hartmann/9310910";
    expect(
      selectMeierVariant(
        defaultUrl,
        [{ url: "https://evil.example/hartmann/9310910" }],
        "9310910",
      ).url,
    ).toBe(defaultUrl);
    expect(
      selectMeierVariant(
        defaultUrl,
        [{ url: link }, { url: link.replace("hartmann", "other") }],
        "9310910",
      ).url,
    ).toBe(defaultUrl);
    expect(selectMeierVariant(defaultUrl, [{ url: link }], "931091").url).toBe(
      defaultUrl,
    );
  });
  it("selects the explicitly linked exact variant from real shop configurators", () => {
    const fixture = readFileSync(
      new URL("./fixtures/meier-search/hartmann-variant.html", import.meta.url),
    );
    const result = parseMeierSearch(fixture, "9310910", 1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].url).toContain("/9310910");
    expect(result.items[0].supplierArticleNumber).toBe("9310910");
    expect(result.items[0].name).toContain("6 cm x 4 m");
    expect(result.items[0].priceLabel).toBeUndefined();
    expect(parseMeierSearch(fixture, "Hartmann", 1).items[0].url).toContain(
      "/9310900",
    );
    expect(parseMeierSearch(fixture, "9310999", 1).items).toEqual([]);
  });
  it("matches the exact linked variant even when metadata uses a group SKU", () => {
    const result = parseMeierSearch(html, "9310910", 1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].supplierArticleNumber).toBe("IDEALAST-GROUP");
    expect(result.items[0].url).toContain("/9310910");
  });
  it.each(["330-023-000", "330/023/000", "330 023 000", "330023000"])(
    "matches normalized linked variant %s",
    (query) => {
      expect(
        parseMeierSearch(html, query, 1).items.map(
          (item) => item.supplierArticleNumber,
        ),
      ).toEqual(["MASK-GROUP"]);
    },
  );
  it("requires all qualifiers even with a matching linked number", () => {
    expect(parseMeierSearch(html, "9310910 rot", 1).items).toEqual([]);
    expect(parseMeierSearch(html, "9310910 blau", 1).items).toHaveLength(1);
  });
  it("does not match an identifier in the product slug", () => {
    expect(
      parseMeierSearch(
        html.replace("hartmann-idealast-haft", "hartmann-12345-haft"),
        "12345",
        1,
      ).items,
    ).toEqual([]);
  });
});
