import { parseMeierProduct } from "../src/modules/catalog/article-import/parser.js";

const url =
  "https://www.meier-medizintechnik.de/aerofusion-einhand-venenstauer-standard-farbe-blau/hvs01-25w-b-v2.0";
function fixture(numbers = ["HVS01-25W/B-V2.0"]) {
  return Buffer.from(`
    <meta charset="utf-8">
    <link rel="canonical" href="${url}">
    <script type="application/ld+json">${JSON.stringify(numbers.map((sku) => ({ "@type": "Product", sku, mpn: sku, brand: { name: "HUM GmbH" } })))}</script>
    <h1 class="product-detail-name">AEROfusion Einhand Venenstauer Standard | Farbe: Blau</h1>
    <p class="product-detail-tax">Preise inkl. MwSt.</p>
    <span class="product-detail-price">3,50 €</span>
    <div class="product-detail-Productkz"><table><tr><td></td><td>Medizinprodukt</td><td>Ja</td></tr></table></div>
  `);
}

describe("Meier product numbers containing slashes", () => {
  it("matches the URL representation while preserving the original article number", () => {
    expect(parseMeierProduct(fixture(), url).data).toMatchObject({
      supplierArticleNumber: "HVS01-25W/B-V2.0",
      manufacturerPartNumber: "HVS01-25W/B-V2.0",
      manufacturer: "HUM GmbH",
      defaultGrossPriceCents: 350,
      medicalDevice: true,
    });
  });

  it("still rejects a different variant", () => {
    expect(() => parseMeierProduct(fixture(["HVS01-25W/R-V2.0"]), url)).toThrow(
      "passender Artikel",
    );
  });

  it("rejects ambiguous product numbers with the same URL representation", () => {
    expect(() =>
      parseMeierProduct(fixture(["HVS01-25W/B-V2.0", "hvs01-25w-b-v2.0"]), url),
    ).toThrow("passender Artikel");
  });
});
