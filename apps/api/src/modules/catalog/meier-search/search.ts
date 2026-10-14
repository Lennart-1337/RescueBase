import { BadRequestException, BadGatewayException } from "@nestjs/common";
import { fetchMeierHtml } from "../meier-fetch.js";
import { parseMeierSearch } from "./parser.js";
export async function searchMeierArticles(
  body: { query?: unknown; page?: unknown },
  request: typeof fetch = fetch,
) {
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const page = body?.page ?? 1;
  if (
    query.length < 2 ||
    query.length > 120 ||
    typeof page !== "number" ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000
  )
    throw new BadRequestException(
      "Bitte einen Suchbegriff mit 2 bis 120 Zeichen und eine gültige Seite eingeben.",
    );
  const url = new URL("https://www.meier-medizintechnik.de/search");
  url.searchParams.set("search", query);
  url.searchParams.set("p", String(page));
  const validate = (value: string) => {
    const target = new URL(value);
    if (
      target.origin !== url.origin ||
      target.pathname !== "/search" ||
      target.username ||
      target.password ||
      target.hash ||
      target.searchParams.get("search") !== query ||
      target.searchParams.get("p") !== String(page) ||
      [...target.searchParams.keys()].some(
        (key) => !["search", "p"].includes(key),
      )
    )
      throw new BadGatewayException(
        "Der Lieferant hat die Suche ungültig weitergeleitet.",
      );
    return target;
  };
  const result = await fetchMeierHtml(url, validate, request, "Suchseite");
  return parseMeierSearch(result.body, query, page);
}
