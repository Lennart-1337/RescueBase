import { jest } from "@jest/globals";
import { fetchMeierProduct } from "../src/modules/catalog/article-import/fetch.js";

const url = "https://meier-medizintechnik.de/test-product/2009068";
const htmlHeaders = { "content-type": "Text/HTML; charset=utf-8" };
const sizeLimit = 5 * 1024 * 1024;

describe("Meier supplier response size limits", () => {
  it.each([undefined, String(sizeLimit)])(
    "accepts exactly the byte limit (content-length: %s)",
    async (length) => {
      const headers = length
        ? { ...htmlHeaders, "content-length": length }
        : htmlHeaders;
      const request = jest
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(new Uint8Array(sizeLimit), { headers }),
        );
      expect((await fetchMeierProduct(url, request)).body.byteLength).toBe(
        sizeLimit,
      );
    },
  );

  it("rejects an oversized declared body before downloading it", async () => {
    const cancel = jest.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const request = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(body, {
        headers: { ...htmlHeaders, "content-length": String(sizeLimit + 1) },
      }),
    );
    await expect(fetchMeierProduct(url, request)).rejects.toThrow("Größe");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("rejects overflow across chunks even with a misleading content-length", async () => {
    const cancel = jest.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(sizeLimit));
        controller.enqueue(new Uint8Array(1));
      },
      cancel,
    });
    const request = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(body, {
        headers: { ...htmlHeaders, "content-length": "1" },
      }),
    );
    await expect(fetchMeierProduct(url, request)).rejects.toThrow("Größe");
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
