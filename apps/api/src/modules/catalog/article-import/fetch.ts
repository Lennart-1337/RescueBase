import {
  BadRequestException,
  BadGatewayException,
  GatewayTimeoutException,
} from "@nestjs/common";
const maxBytes = 5 * 1024 * 1024;
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
      !/^\/[a-z0-9-]+\/[a-z0-9._-]+\/?$/iu.test(url.pathname)
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
  let url = validateMeierUrl(value);
  const signal = AbortSignal.timeout(10_000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await request(url, {
        redirect: "manual",
        signal,
        credentials: "omit",
        headers: {
          Accept: "text/html",
          "User-Agent": "RescueBase product import",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 3)
          throw new BadGatewayException(
            "Zu viele oder ungültige Weiterleitungen beim Lieferanten.",
          );
        url = validateMeierUrl(new URL(location, url).toString());
        continue;
      }
      if (
        !response.ok ||
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .includes("text/html")
      ) {
        await response.body?.cancel();
        throw new BadGatewayException(
          "Der Lieferant liefert keine erreichbare Produktseite.",
        );
      }
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw new BadGatewayException(
          "Die Produktseite überschreitet die zulässige Größe.",
        );
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (!response.body)
        throw new BadGatewayException("Die Produktseite ist leer.");
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          throw new BadGatewayException(
            "Die Produktseite überschreitet die zulässige Größe.",
          );
        }
        chunks.push(chunk);
      }
      return { body: Buffer.concat(chunks), url: url.toString() };
    }
    throw new BadGatewayException(
      "Die Produktseite konnte nicht geladen werden.",
    );
  } catch (error) {
    if (
      signal.aborted ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        ["TimeoutError", "AbortError"].includes(String(error.name)))
    )
      throw new GatewayTimeoutException(
        "Das Laden der Produktseite hat zu lange gedauert.",
      );
    if (
      error instanceof BadRequestException ||
      error instanceof BadGatewayException
    )
      throw error;
    throw new BadGatewayException(
      "Die Produktseite konnte nicht geladen werden. Bitte später erneut versuchen.",
    );
  }
}
