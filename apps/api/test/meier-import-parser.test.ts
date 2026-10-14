import { readFileSync } from "node:fs";
import { parseMeierProduct } from "../src/modules/catalog/article-import/parser.js";
const url =
  "https://www.meier-medizintechnik.de/soehngen-kontamed-chen-kanuelensammler-abwurfbox/2009068";
const fixture = readFileSync(
  new URL("./fixtures/meier/product.html", import.meta.url),
);
describe("Meier product preview", () => {
  it("uses the selected product, actual sale package and gross sale price", () => {
    const result = parseMeierProduct(fixture, url);
    expect(result.data).toMatchObject({
      name: "SÖHNGEN® KONTAMED'chen® Kanülensammler / Abwurfbox",
      supplierArticleNumber: "2009068",
      manufacturerPartNumber: "2009068",
      manufacturer: "W. Söhngen GmbH",
      barcode: "4250108803874",
      unit: "Stück",
      unitsPerPackage: 1,
      defaultGrossPriceCents: 150,
      medicalDevice: true,
      articleUrl: url,
    });
    expect(result.warnings.join(" ")).toContain("150 Stück");
  });
  it("imports the first tier price rather than the bulk discount minimum", () => {
    const body = readFileSync(
      new URL("./fixtures/meier/sarstedt.html", import.meta.url),
    );
    const sourceUrl =
      "https://www.meier-medizintechnik.de/sarstedt-multi-safe-quick-kanuelen-entsorgungsbox-abwurfbox-volumen-0-5-liter/77.3891.005";
    const result = parseMeierProduct(body, sourceUrl);
    expect(result.data.defaultGrossPriceCents).toBe(86);
    expect(result.warnings.join(" ")).toContain("Staffelpreise");
    expect(result.data.unitsPerPackage).toBeUndefined();
    expect(result.warnings.join(" ")).toContain("VE");
  });
  it("does not interpret a net price as gross", () => {
    const html = fixture.toString().replaceAll("inkl. MwSt.", "zzgl. MwSt.");
    expect(
      parseMeierProduct(Buffer.from(html), url).data.defaultGrossPriceCents,
    ).toBeUndefined();
  });
  it("rejects pages without matching product identity", () => {
    expect(() =>
      parseMeierProduct(Buffer.from("<h1>Login</h1>"), url),
    ).toThrow();
    expect(() =>
      parseMeierProduct(fixture, url.replace("2009068", "wrong")),
    ).toThrow();
  });
});
