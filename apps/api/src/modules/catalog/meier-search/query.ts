import type { MeierSearchItem } from "./types.js";

export function expandMeierQuery(query: string): string {
  return query
    .normalize("NFC")
    .replace(
      /(?<![\p{L}\p{N}])braun(?:ü|ue)len?(?![\p{L}\p{N}])/giu,
      "Venenverweilkanüle",
    );
}

const fold = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("ß", "ss");
const words = (value: string) => fold(value).match(/[\p{L}\p{N}]+/gu) ?? [];

export function matchesMeierQuery(
  item: MeierSearchItem,
  query: string,
): boolean {
  const tokens = words(query);
  // The already validated link identifies the variant; metadata may identify its group.
  const variantNumber =
    new URL(item.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const identifiers = [item.supplierArticleNumber ?? "", variantNumber];
  const productWords = words(
    `${item.name} ${item.manufacturer ?? ""} ${identifiers.join(" ")}`,
  );
  // Full article numbers can use spaces, slashes or hyphens interchangeably.
  if (
    tokens.length &&
    /\d/u.test(query) &&
    identifiers.some((identifier) =>
      words(identifier).join("").includes(tokens.join("")),
    )
  )
    return true;
  return (
    tokens.length > 0 &&
    tokens.every((token) =>
      productWords.some((word) =>
        token.length <= 2 ? word === token : word.includes(token),
      ),
    )
  );
}
