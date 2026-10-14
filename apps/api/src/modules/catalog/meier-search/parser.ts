import { BadGatewayException } from "@nestjs/common";
import { loadBuffer } from "cheerio";
import { validateMeierUrl } from "../article-import/fetch.js";
import type { MeierSearchItem, MeierSearchResult } from "./types.js";
const text = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/\s+/gu, " ").trim() || undefined
    : undefined;
export function parseMeierSearch(
  html: string | Buffer,
  query: string,
  page: number,
): MeierSearchResult {
  const $ = loadBuffer(typeof html === "string" ? Buffer.from(html) : html, {
    encoding: { defaultEncoding: "utf8" },
  });
  if (
    !$(".search-page .search-headline").length ||
    !$(".search-page [data-listing]").length
  )
    throw new BadGatewayException(
      "Die Meier-Suchergebnisse konnten nicht gelesen werden. Bitte später erneut versuchen.",
    );
  const cards = $(".search-page [data-listing] .product-box");
  if (
    !cards.length &&
    !/Keine Produkte gefunden/iu.test(
      $(".search-page [data-listing] .alert-content-container").text(),
    )
  )
    throw new BadGatewayException(
      "Die Meier-Suchseite enthält keine erkennbaren Ergebnisse.",
    );
  const items: MeierSearchItem[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  $(".search-page [data-listing] .product-box").each((_, element) => {
    const card = $(element);
    try {
      const link = card.find("a.productbox-name").first();
      const name = text(link.text());
      const href =
        link.attr("href") ??
        card.find("a.product-image-link").first().attr("href");
      if (!name || !href) throw new Error();
      const url = validateMeierUrl(
        new URL(href, "https://www.meier-medizintechnik.de").toString(),
      ).toString();
      if (seen.has(url)) return;
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(card.attr("data-product-information") ?? "{}");
      } catch {
        /* Visible product data remains usable. */
      }
      const supplierArticleNumber = text(metadata?.sku);
      const manufacturer = text(
        typeof metadata?.brand === "string"
          ? metadata.brand.replace(/\\u([a-f0-9]{4})/giu, (_, code: string) =>
              String.fromCharCode(Number.parseInt(code, 16)),
            )
          : undefined,
      );
      const priceLabel = text(card.find(".product-price").first().text());
      items.push({
        name,
        url,
        ...(supplierArticleNumber ? { supplierArticleNumber } : {}),
        ...(manufacturer ? { manufacturer } : {}),
        ...(priceLabel ? { priceLabel } : {}),
      });
      seen.add(url);
    } catch {
      skipped++;
    }
  });
  const pages = $(".search-page .pagination .page-link[data-page]")
    .map((_, element) => Number($(element).attr("data-page")))
    .get()
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 10000);
  return {
    query,
    page,
    totalPages: Math.max(page, ...pages),
    items,
    warnings: skipped
      ? [
          `${skipped} Suchtreffer konnten nicht sicher gelesen werden und wurden ausgelassen.`,
        ]
      : [],
  };
}
