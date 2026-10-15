import {
  BadRequestException,
  BadGatewayException,
  GatewayTimeoutException,
} from "@nestjs/common";
const maxBytes = 5 * 1024 * 1024;
export async function fetchMeierHtml(
  value: URL,
  validate: (value: string) => URL,
  request: typeof fetch = fetch,
  pageLabel = "Produktseite",
  headers: Record<string, string> = {},
) {
  let url = value;
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
          ...headers,
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 3)
          throw new BadGatewayException(
            "Zu viele oder ungültige Weiterleitungen beim Lieferanten.",
          );
        url = validate(new URL(location, url).toString());
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
          `Der Lieferant liefert keine erreichbare ${pageLabel}.`,
        );
      }
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw new BadGatewayException(
          `Die ${pageLabel} überschreitet die zulässige Größe.`,
        );
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (!response.body)
        throw new BadGatewayException(`Die ${pageLabel} ist leer.`);
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          throw new BadGatewayException(
            `Die ${pageLabel} überschreitet die zulässige Größe.`,
          );
        }
        chunks.push(chunk);
      }
      return { body: Buffer.concat(chunks), url: url.toString() };
    }
    throw new BadGatewayException(
      `Die ${pageLabel} konnte nicht geladen werden.`,
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
        `Das Laden der ${pageLabel} hat zu lange gedauert.`,
      );
    if (
      error instanceof BadRequestException ||
      error instanceof BadGatewayException
    )
      throw error;
    throw new BadGatewayException(
      `Die ${pageLabel} konnte nicht geladen werden. Bitte später erneut versuchen.`,
    );
  }
}
