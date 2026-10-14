export const meierPageUrl = "https://www.meier-medizintechnik.de/product/123";
export function meierPage(
  metadata: unknown = { "@type": "Product", sku: "123" },
  markup = "",
) {
  return Buffer.from(
    `<meta charset="utf-8"><link rel="canonical" href="${meierPageUrl}"><script type="application/ld+json">${JSON.stringify(metadata)}</script><h1 class="product-detail-name">Ärztebedarf</h1>${markup}`,
  );
}
