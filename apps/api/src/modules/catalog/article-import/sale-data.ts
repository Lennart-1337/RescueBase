import type { CheerioAPI } from "cheerio";
import type { ArticleImportData } from "./types.js";
import { text } from "./structured-data.js";
export function applySaleData(
  $: CheerioAPI,
  data: ArticleImportData,
  warnings: string[],
) {
  const content = text($(".price-unit-content").first().text());
  const pack = content?.match(/^(\d+)\s+(Stück|Paar|Set)\b/iu);
  if (pack && Number(pack[1]) > 0) {
    data.unit = pack[2];
    data.unitsPerPackage = Number(pack[1]);
  } else
    warnings.push(
      "Einheit und VE konnten nicht eindeutig ermittelt werden. Bitte prüfen.",
    );
  $(".product-detail-properties-table .properties-row").each((_, element) => {
    const label = text($(element).find(".properties-label").text()) ?? "";
    const value = text($(element).find(".properties-value").text());
    if (/Verpackungseinheit kaufen/iu.test(label) && value && value !== content)
      warnings.push(
        `Der Lieferant nennt zusätzlich eine Großverpackung mit ${value}. Übernommen wird die angebotene Verkaufseinheit (${content ?? "unbekannt"}).`,
      );
    if (/^Medizinprodukt:?$/iu.test(label) && /^(ja|nein)$/iu.test(value ?? ""))
      data.medicalDevice = value?.toLowerCase() === "ja";
  });
  $(".product-detail-Productkz table tr").each((_, element) => {
    const cells = $(element).find("td");
    if (text(cells.eq(1).text()) === "Medizinprodukt") {
      const value = text(cells.eq(2).text())?.toLowerCase();
      if (value === "ja" || value === "nein")
        data.medicalDevice = value === "ja";
    }
  });
  if ($(".product-block-prices-row").length > 1)
    warnings.push(
      "Staffelpreise vorhanden: Übernommen wird der Bruttoverkaufspreis der ersten Mengenstaffel. Bitte vor dem Speichern prüfen.",
    );
  const tax = $(".product-detail-tax").first().text();
  const priceText =
    text($(".product-detail-price").first().text()) ??
    text($(".product-block-prices-cell").first().text());
  const price = priceText?.match(/^(\d+(?:\.\d{3})*,\d{2})\s*€$/u);
  if (
    price?.[1] &&
    /inkl\.?\s*MwSt/iu.test(tax) &&
    !/zzgl\.?\s*MwSt/iu.test(tax) &&
    price
  ) {
    data.defaultGrossPriceCents = Math.round(
      Number(price[1].replaceAll(".", "").replace(",", ".")) * 100,
    );
  } else
    warnings.push(
      "Der Bruttoverkaufspreis konnte nicht eindeutig ermittelt werden. Bitte prüfen.",
    );
}
