import { BadGatewayException } from "@nestjs/common";
import { loadBuffer } from "cheerio";
import { parseMeierSearchCard } from "./card.js";
import { expandMeierQuery, matchesMeierQuery } from "./query.js";
import type { MeierSearchItem, MeierSearchResult } from "./types.js";
export function parseMeierSearch(
  html: string | Buffer,
  query: string,
  page: number,
): MeierSearchResult {
  const $ = loadBuffer(typeof html === "string" ? Buffer.from(html) : html, {
    encoding: { defaultEncoding: "utf8" },
  });
  const scope = $(".search-page").length
    ? $(".search-page")
    : $(".cms-element-product-listing-wrapper[data-listing]");
  const listing = scope.is("[data-listing]")
    ? scope
    : scope.find("[data-listing]");
  if (!listing.length)
    throw new BadGatewayException(
      "Die Meier-Suchergebnisse konnten nicht gelesen werden. Bitte später erneut versuchen.",
    );
  const cards = listing.find(".product-box");
  if (
    !cards.length &&
    !/Keine Produkte gefunden/iu.test(
      listing.find(".alert-content-container").text(),
    )
  )
    throw new BadGatewayException(
      "Die Meier-Suchseite enthält keine erkennbaren Ergebnisse.",
    );
  const items: MeierSearchItem[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let irrelevant = 0;
  const expandedQuery = expandMeierQuery(query);
  cards.each((_, element) => {
    const card = $(element);
    try {
      const item = parseMeierSearchCard($, card, expandedQuery);
      const { url } = item;
      if (seen.has(url)) return;
      seen.add(url);
      if (!matchesMeierQuery(item, expandedQuery)) {
        irrelevant++;
        return;
      }
      items.push(item);
    } catch {
      skipped++;
    }
  });
  const pages = scope
    .find(".page-link[data-page]")
    .map((_, element) => Number($(element).attr("data-page")))
    .get()
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 10000);
  return {
    query,
    page,
    totalPages: Math.max(page, ...pages),
    items,
    warnings: [
      ...(expandedQuery !== query.normalize("NFC")
        ? [`Meier wird nach „${expandedQuery}“ durchsucht.`]
        : []),
      ...(irrelevant
        ? [
            `${irrelevant} unpassende Suchtreffer auf dieser Seite wurden ausgeblendet. Die Seitenanzahl entspricht weiterhin der Meier-Suche.`,
          ]
        : []),
      ...(skipped
        ? [
            `${skipped} Suchtreffer konnten nicht sicher gelesen werden und wurden ausgelassen.`,
          ]
        : []),
    ],
  };
}
