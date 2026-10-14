import { BadRequestException } from "@nestjs/common";
import { fetchMeierHtml } from "../meier-fetch.js";
export function validateMeierUrl(value: unknown): URL {
  try {
    if (typeof value !== "string" || value.length > 2048) throw new Error();
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["www.meier-medizintechnik.de", "meier-medizintechnik.de"].includes(
        url.hostname,
      ) ||
      url.port ||
      url.username ||
      url.password ||
      !/^\/[a-z0-9._-]+\/[a-z0-9._-]+\/?$/iu.test(url.pathname)
    )
      throw new Error();
    url.hash = "";
    url.search = "";
    return url;
  } catch {
    throw new BadRequestException(
      "Bitte einen gültigen HTTPS-Produktlink von Meier Medizintechnik eingeben.",
    );
  }
}
export async function fetchMeierProduct(
  value: unknown,
  request: typeof fetch = fetch,
) {
  return fetchMeierHtml(validateMeierUrl(value), validateMeierUrl, request);
}
