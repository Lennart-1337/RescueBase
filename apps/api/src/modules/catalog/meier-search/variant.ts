import { validateMeierUrl } from "../article-import/fetch.js";
const identifier = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/gu, "");
type VariantLink = { url: string; label?: string };

export function selectMeierVariant(
  defaultUrl: string,
  links: VariantLink[],
  query: string,
): VariantLink {
  if (!/\d/u.test(query)) return { url: defaultUrl };
  const matches = new Map<string, VariantLink>();
  for (const link of links) {
    try {
      const url = validateMeierUrl(new URL(link.url, defaultUrl).toString());
      const number = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
      if (identifier(number) === identifier(query))
        matches.set(url.toString(), { ...link, url: url.toString() });
    } catch {
      // Unsafe variant links cannot replace a validated product link.
    }
  }
  return (
    (matches.size === 1 ? [...matches.values()][0] : undefined) ?? {
      url: defaultUrl,
    }
  );
}
