import { jest } from "@jest/globals";
import { fetchMeierProduct } from "../src/modules/catalog/article-import/fetch.js";

const url = "https://meier-medizintechnik.de/test-product/2009068";
const htmlHeaders = { "content-type": "Text/HTML; charset=utf-8" };

describe("Meier supplier response contract", () => {
  it("follows relative redirects and the supplier's canonical www host", async () => {
    const finalUrl = "https://www.meier-medizintechnik.de/new-product/2009068";
    const request = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: "/new-product/2009068?tracking=1" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 308,
          headers: { location: finalUrl },
        }),
      )
      .mockResolvedValueOnce(
        new Response("<html>Ärztebedarf</html>", { headers: htmlHeaders }),
      );
    const result = await fetchMeierProduct(url, request);
    expect(result.url).toBe(finalUrl);
    expect(result.body.toString("utf8")).toBe("<html>Ärztebedarf</html>");
    expect(request.mock.calls.map(([target]) => target.toString())).toEqual([
      url,
      "https://meier-medizintechnik.de/new-product/2009068",
      finalUrl,
    ]);
  });

  it.each([
    [404, htmlHeaders],
    [200, { "content-type": "application/json" }],
    [200, {}],
  ])(
    "rejects and releases unusable responses (%s, %j)",
    async (status, headers) => {
      const cancel = jest.fn();
      const body = new ReadableStream<Uint8Array>({ cancel });
      const request = jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(body, { status, headers }));
      await expect(fetchMeierProduct(url, request)).rejects.toMatchObject({
        status: 502,
      });
      expect(cancel).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects a missing response body", async () => {
    const request = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { headers: htmlHeaders }));
    await expect(fetchMeierProduct(url, request)).rejects.toThrow("leer");
  });

  it("reports transport failures without leaking their details", async () => {
    const request = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("internal connection detail"));
    await expect(fetchMeierProduct(url, request)).rejects.toThrow(
      "Bitte später erneut versuchen",
    );
  });

  it.each(["TimeoutError", "AbortError"])(
    "reports %s while reading the body as a timeout",
    async (name) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("<html>"));
        },
        pull(controller) {
          controller.error(new DOMException("stream interrupted", name));
        },
      });
      const request = jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(body, { headers: htmlHeaders }));
      await expect(fetchMeierProduct(url, request)).rejects.toMatchObject({
        status: 504,
      });
    },
  );
});
