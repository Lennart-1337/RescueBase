import { jest } from "@jest/globals";
import {
  fetchMeierProduct,
  validateMeierUrl,
} from "../src/modules/catalog/article-import/fetch.js";
const url = "https://www.meier-medizintechnik.de/test-product/2009068";
const html = () =>
  new Response("<html></html>", { headers: { "content-type": "text/html" } });
describe("bounded Meier supplier fetch", () => {
  it("accepts product slugs containing punctuation used in manufacturer names", async () => {
    const sourceUrl =
      "https://www.meier-medizintechnik.de/b.-braun-injekt-luer-solo-einmalspritzen-5-ml-packung-a-100-stueck/4606051v";
    const request = jest.fn<typeof fetch>().mockResolvedValue(html());
    const result = await fetchMeierProduct(sourceUrl, request);
    expect(result.url).toBe(sourceUrl);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0].toString()).toBe(sourceUrl);
  });

  it.each([
    undefined,
    "not a URL",
    "http://www.meier-medizintechnik.de/p/1",
    "https://evil.meier-medizintechnik.de/p/1",
    "https://www.meier-medizintechnik.de:123/p/1",
    "https://user:pass@www.meier-medizintechnik.de/p/1",
    "https://localhost/p/1",
  ])("rejects unsafe input %s", async (value) => {
    const request = jest.fn<typeof fetch>();
    await expect(fetchMeierProduct(value, request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("strips tracking parameters and does not automatically follow redirects", async () => {
    const request = jest.fn<typeof fetch>().mockResolvedValue(html());
    expect(validateMeierUrl(url + "?secret=1#x").toString()).toBe(url);
    await fetchMeierProduct(url, request);
    expect(request.mock.calls[0][1]).toMatchObject({
      redirect: "manual",
      credentials: "omit",
    });
  });
  it("never requests a redirect target outside the supplier", async () => {
    const request = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "http://localhost/p/1" },
        }),
      );
    await expect(fetchMeierProduct(url, request)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("bounds redirect chains", async () => {
    const request = jest
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(null, { status: 302, headers: { location: url } }),
      );
    await expect(fetchMeierProduct(url, request)).rejects.toThrow(
      "Weiterleitungen",
    );
    expect(request).toHaveBeenCalledTimes(4);
  });
  it("reports supplier failures and request timeouts", async () => {
    await expect(
      fetchMeierProduct(
        url,
        jest
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("denied", { status: 403 })),
      ),
    ).rejects.toThrow("Produktseite");
    await expect(
      fetchMeierProduct(
        url,
        jest
          .fn<typeof fetch>()
          .mockRejectedValue(new DOMException("timeout", "TimeoutError")),
      ),
    ).rejects.toThrow("zu lange");
  });
  it("bounds declared and streamed response sizes", async () => {
    const request = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("x", {
          headers: { "content-type": "text/html", "content-length": "6000000" },
        }),
      );
    await expect(fetchMeierProduct(url, request)).rejects.toThrow("Größe");
    request.mockResolvedValue(
      new Response("x".repeat(5 * 1024 * 1024 + 1), {
        headers: { "content-type": "text/html" },
      }),
    );
    await expect(fetchMeierProduct(url, request)).rejects.toThrow("Größe");
  });
});
