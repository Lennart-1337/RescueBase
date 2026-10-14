import { parseMeierProduct } from "../src/modules/catalog/article-import/parser.js";
const bandageUrl =
  "https://www.meier-medizintechnik.de/hartmann-idealast-haft-kohaesive-idealbinde-latexfrei-farbe-blau-groesse-4-meter/9310910";
const ambuUrl =
  "https://www.meier-medizintechnik.de/ambu-spur-ii-einweg-beatmungsbeutel-kinder/330-023-000";
const selected = {
  "@type": "Product",
  sku: "9310910",
  gtin13: "4052199208909",
};
const group = {
  "@type": "ProductGroup",
  sku: "9310910",
  brand: { name: "PAUL HARTMANN AG" },
  hasVariant: [
    { "@type": "Product", sku: "9310900", gtin13: "4052199208886" },
    selected,
  ],
};
function fixture(url: string, products: unknown) {
  return Buffer.from(
    `<meta charset="utf-8"><link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify(products)}</script><h1 class="product-detail-name">Produkt</h1><p class="product-detail-tax">Preise inkl. MwSt.</p><span class="product-detail-price">5,90 €</span>`,
  );
}
describe("Meier nested variants and spaced article numbers", () => {
  it("selects the linked variant and inherits its shared manufacturer", () => {
    expect(
      parseMeierProduct(fixture(bandageUrl, [group]), bandageUrl).data,
    ).toMatchObject({
      supplierArticleNumber: "9310910",
      barcode: "4052199208909",
      manufacturer: "PAUL HARTMANN AG",
    });
  });
  it("retains a variant-specific manufacturer", () => {
    const value = {
      ...group,
      hasVariant: [{ ...selected, brand: { name: "Variant manufacturer" } }],
    };
    expect(
      parseMeierProduct(fixture(bandageUrl, value), bandageUrl).data
        .manufacturer,
    ).toBe("Variant manufacturer");
  });
  it("never copies another variant's identifiers", () => {
    const value = {
      ...group,
      gtin13: "wrong-group-barcode",
      mpn: "wrong-group-mpn",
      hasVariant: [{ "@type": "Product", sku: "9310910" }],
    };
    const data = parseMeierProduct(fixture(bandageUrl, value), bandageUrl).data;
    expect(data.barcode).toBeUndefined();
    expect(data.manufacturerPartNumber).toBeUndefined();
  });
  it("rejects a group without the requested concrete variant", () => {
    const value = { ...group, hasVariant: [{ ...selected, sku: "9310920" }] };
    expect(() =>
      parseMeierProduct(fixture(bandageUrl, value), bandageUrl),
    ).toThrow("passender Artikel");
  });
  it("rejects duplicate matching nested variants", () => {
    const value = { ...group, hasVariant: [selected, selected] };
    expect(() =>
      parseMeierProduct(fixture(bandageUrl, value), bandageUrl),
    ).toThrow("passender Artikel");
  });
  it("matches spaces represented by hyphens and preserves original SKU and MPN", () => {
    const value = [
      {
        "@type": "Product",
        sku: "330 023 000",
        mpn: "330023000",
        brand: { name: "Ambu GmbH" },
      },
    ];
    expect(
      parseMeierProduct(fixture(ambuUrl, value), ambuUrl).data,
    ).toMatchObject({
      supplierArticleNumber: "330 023 000",
      manufacturerPartNumber: "330023000",
      manufacturer: "Ambu GmbH",
    });
  });
});
