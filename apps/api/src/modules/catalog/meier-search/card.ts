import type { CheerioAPI } from "cheerio";
import { validateMeierUrl } from "../article-import/fetch.js";
import { selectMeierVariant } from "./variant.js";
import type { MeierSearchItem } from "./types.js";
const text = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/\s+/gu, " ").trim() || undefined
    : undefined;

export function parseMeierSearchCard(
  $: CheerioAPI,
  card: ReturnType<CheerioAPI>,
  expandedQuery: string,
): MeierSearchItem {
  const link = card.find("a.productbox-name").first();
  const name = text(link.text());
  const href =
    link.attr("href") ?? card.find("a.product-image-link").first().attr("href");
  if (!name || !href) throw new Error();
  const defaultUrl = validateMeierUrl(
    new URL(href, "https://www.meier-medizintechnik.de").toString(),
  ).toString();
  const variant = selectMeierVariant(
    defaultUrl,
    card
      .find("a.product-detail-configurator-option[href]")
      .map((_, option) => ({
        url: $(option).attr("href") ?? "",
        label: text($(option).attr("aria-label")),
      }))
      .get(),
    expandedQuery,
  );
  const { url } = variant;
  const selectedVariant = url !== defaultUrl;
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(card.attr("data-product-information") ?? "{}");
  } catch {
    /* Visible product data remains usable. */
  }
  const supplierArticleNumber = selectedVariant
    ? new URL(url).pathname.split("/").filter(Boolean).at(-1)
    : text(metadata?.sku);
  const manufacturer = text(
    typeof metadata?.brand === "string"
      ? metadata.brand.replace(/\\u([a-f0-9]{4})/giu, (_, code: string) =>
          String.fromCharCode(Number.parseInt(code, 16)),
        )
      : undefined,
  );
  const priceLabel = selectedVariant
    ? undefined
    : text(card.find(".product-price").first().text());
  return {
    name:
      selectedVariant && variant.label ? `${name} | ${variant.label}` : name,
    url,
    ...(supplierArticleNumber ? { supplierArticleNumber } : {}),
    ...(manufacturer ? { manufacturer } : {}),
    ...(priceLabel ? { priceLabel } : {}),
  };
}
