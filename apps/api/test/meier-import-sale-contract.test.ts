import { parseMeierProduct } from "../src/modules/catalog/article-import/parser.js";
import { meierPage, meierPageUrl } from "./support/meier-page.js";
const parse = (markup: string) =>
  parseMeierProduct(meierPage(undefined, markup), meierPageUrl);
describe("Meier price, package and medical device contract", () => {
  it.each([
    ["Ja", true],
    ["Nein", false],
  ])("reads explicit medical device property %s", (value, expected) => {
    const markup = `<table class="product-detail-properties-table"><tr class="properties-row"><td class="properties-label">Medizinprodukt:</td><td class="properties-value">${value}</td></tr></table>`;
    expect(parse(markup).data.medicalDevice).toBe(expected);
  });
  it.each(["Unbekannt", "", "Vielleicht"])(
    "never treats unspecified medical device status %s as false",
    (value) => {
      const markup = `<div class="product-detail-Productkz"><table><tr><td></td><td>Medizinprodukt</td><td>${value}</td></tr></table></div>`;
      expect(parse(markup).data.medicalDevice).toBeUndefined();
    },
  );
  it.each(["", "Preise zzgl. MwSt."])(
    "does not infer gross prices without explicit VAT-inclusive evidence: %s",
    (tax) => {
      expect(
        parse(
          `<p class="product-detail-tax">${tax}</p><span class="product-detail-price">12,50 €</span>`,
        ).data.defaultGrossPriceCents,
      ).toBeUndefined();
    },
  );
  it.each([
    ["0,00 €", 0],
    ["1.234,56 €", 123456],
  ])("reads gross monetary amount %s", (price, expected) => {
    expect(
      parse(
        `<p class="product-detail-tax">Preise inkl. MwSt.</p><span class="product-detail-price">${price}</span>`,
      ).data.defaultGrossPriceCents,
    ).toBe(expected);
  });
  it.each(["4 Meter", "0 Stück", "1,5 Stück", "unbekannt"])(
    "does not invent package counts for %s",
    (content) => {
      const result = parse(
        `<span class="price-unit-content">${content}</span>`,
      );
      expect(result.data.unitsPerPackage).toBeUndefined();
      expect(result.data.unit).toBeUndefined();
      expect(result.warnings.join(" ")).toContain("VE");
    },
  );
});
