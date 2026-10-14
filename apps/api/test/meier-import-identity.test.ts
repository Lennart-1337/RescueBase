import { parseMeierProduct } from "../src/modules/catalog/article-import/parser.js";

const url =
  "https://www.meier-medizintechnik.de/aerosuc-absaugkatheter-ch-12-farbe-weiss/hak11-50-12";
const fixture = Buffer.from(`
  <meta charset="utf-8">
  <link rel="canonical" href="${url}">
  <script type="application/ld+json">
    {"@type":"Product","sku":"HAK11-50-12","mpn":"HAK11-50-12","brand":{"name":"HUM GmbH"},"gtin13":"4251233803777"}
  </script>
  <h1 class="product-detail-name">AEROsuc® Absaugkatheter CH 12 | Farbe: Weiß</h1>
  <p class="product-detail-tax">Preise inkl. MwSt.</p>
  <span class="product-detail-price">0,28 €</span>
`);

describe("Meier product identity", () => {
  it.each([url, url.replace("hak11-50-12", "HAK11-50-12")])(
    "matches URL and product numbers regardless of casing: %s",
    (sourceUrl) => {
      const result = parseMeierProduct(fixture, sourceUrl);
      expect(result.data).toMatchObject({
        name: "AEROsuc® Absaugkatheter CH 12 | Farbe: Weiß",
        supplierArticleNumber: "HAK11-50-12",
        manufacturerPartNumber: "HAK11-50-12",
        barcode: "4251233803777",
        defaultGrossPriceCents: 28,
      });
    },
  );

  it("rejects different variants rather than matching their shared prefix", () => {
    expect(() =>
      parseMeierProduct(fixture, url.replace("hak11-50-12", "hak11-50-18")),
    ).toThrow("passender Artikel");
  });

  it("rejects ambiguous products with case-equivalent numbers", () => {
    const duplicate = fixture
      .toString()
      .replace(
        "</script>",
        '</script><script type="application/ld+json">{"@type":"Product","sku":"hak11-50-12"}</script>',
      );
    expect(() => parseMeierProduct(Buffer.from(duplicate), url)).toThrow(
      "passender Artikel",
    );
  });
});
