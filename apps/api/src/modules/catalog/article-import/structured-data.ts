import type { CheerioAPI } from "cheerio";
export type StructuredProduct = Record<string, unknown>;
function records(value: unknown): StructuredProduct[] {
  if (Array.isArray(value)) return value.flatMap(records);
  if (!value || typeof value !== "object") return [];
  const record = value as StructuredProduct;
  return [record, ...records(record["@graph"])];
}
export function findProduct($: CheerioAPI, sku: string) {
  const products: StructuredProduct[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      products.push(...records(JSON.parse($(element).text())));
    } catch {
      /* Invalid supplier metadata is ignored. */
    }
  });
  const matches = products.filter(
    (value) => value["@type"] === "Product" && text(value.sku) === sku,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.replace(/\s+/gu, " ").trim()
    : undefined;
}
