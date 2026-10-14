import { parseMeierProduct } from "../src/modules/catalog/article-import/parser.js";
import { meierPage, meierPageUrl } from "./support/meier-page.js";
const product = {
  "@type": "Product",
  sku: "123",
  brand: { name: "Hersteller" },
};
const parse = (body: Buffer) => parseMeierProduct(body, meierPageUrl);
describe("Meier metadata identity contract", () => {
  it("finds a product in @graph without choosing matching breadcrumb metadata", () => {
    const body = meierPage({
      "@graph": [
        { "@type": "BreadcrumbList", sku: "123" },
        { "@type": "Product", sku: "124" },
        product,
      ],
    });
    expect(parse(body).data.manufacturer).toBe("Hersteller");
  });
  it("ignores a malformed metadata block when a separate valid product exists", () => {
    const body = Buffer.from(
      meierPage(product)
        .toString()
        .replace(
          '<script type="application/ld+json">',
          '<script type="application/ld+json">{broken}</script><script type="application/ld+json">',
        ),
    );
    expect(parse(body).data.supplierArticleNumber).toBe("123");
  });
  it.each([
    null,
    { "@type": "BreadcrumbList", sku: "123" },
    { "@type": "Product", sku: 123 },
    { "@type": "Product" },
  ])("rejects missing or untrusted identity %j", (metadata) => {
    expect(() => parse(meierPage(metadata))).toThrow("passender Artikel");
  });
  it("rejects an unrelated canonical product even when metadata SKU matches", () => {
    const body = Buffer.from(
      meierPage(product)
        .toString()
        .replace(
          `href="${meierPageUrl}"`,
          'href="https://www.meier-medizintechnik.de/other/124"',
        ),
    );
    expect(() => parse(body)).toThrow("passender Artikel");
  });
  it("rejects error pages without a product heading", () => {
    const body = Buffer.from(
      meierPage(product)
        .toString()
        .replace(/<h1[^>]*>.*?<\/h1>/u, ""),
    );
    expect(() => parse(body)).toThrow("passender Artikel");
  });
  it("accepts canonical trailing slashes and preserves leading zeros in GTINs", () => {
    const body = Buffer.from(
      meierPage({ ...product, gtin14: "05707480043736" })
        .toString()
        .replace(`href="${meierPageUrl}"`, `href="${meierPageUrl}/"`),
    );
    expect(parse(body).data.barcode).toBe("05707480043736");
  });
});
