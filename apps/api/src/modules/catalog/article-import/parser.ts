import { BadGatewayException } from "@nestjs/common";
import { loadBuffer } from "cheerio";
import { validateMeierUrl } from "./fetch.js";
import { findProduct, text } from "./structured-data.js";
import { applySaleData } from "./sale-data.js";
import type { ArticleImportPreview } from "./types.js";
export function parseMeierProduct(
  body: Buffer,
  sourceUrl: string,
): ArticleImportPreview {
  const url = validateMeierUrl(sourceUrl);
  const $ = loadBuffer(body);
  const sku = url.pathname.split("/").filter(Boolean).at(-1)!;
  const product = findProduct($, sku);
  const name = text($("h1.product-detail-name").first().text());
  const canonical = $('link[rel="canonical"]').attr("href");
  if (
    !product ||
    !name ||
    (canonical &&
      validateMeierUrl(canonical).pathname.replace(/\/$/u, "") !==
        url.pathname.replace(/\/$/u, ""))
  )
    throw new BadGatewayException(
      "Auf dieser Seite wurde kein eindeutig passender Artikel gefunden.",
    );
  const brand = product.brand as { name?: unknown } | undefined;
  const result: ArticleImportPreview = {
    source: "MEIER_MEDIZINTECHNIK",
    sourceUrl: url.toString(),
    fetchedAt: new Date().toISOString(),
    supplierName: "Meier Medizintechnik",
    data: {
      name,
      articleUrl: url.toString(),
      supplierArticleNumber: sku,
      manufacturer: text(brand?.name),
      manufacturerPartNumber:
        text($(".twt-product-detail-manufacturernumber").first().text()) ??
        text(product.mpn),
      barcode:
        text(product.gtin13) ?? text(product.gtin14) ?? text(product.gtin),
    },
    warnings: [],
  };
  applySaleData($, result.data, result.warnings);
  return result;
}
