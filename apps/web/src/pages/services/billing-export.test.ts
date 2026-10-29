import { exportBillingDocument } from "./billing-export";
import { serviceFixture } from "./test-fixtures";
const input = { kind: "OFFER" as const, number: "012 SAN 2026", issuedOn: "2026-10-29", recipient: "Sportverein\nMusterstraße 1\n47506 Neukirchen-Vluyn" };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("posts versioned document data and downloads the returned PDF", async () => {
  vi.useFakeTimers();
  const blob = new Blob(["%PDF-1.7"], { type: "application/pdf" });
  const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
  vi.stubGlobal("fetch", fetch);
  const create = vi.fn(() => "blob:test");
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  let downloaded = "";
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { downloaded = this.download; });
  await exportBillingDocument(serviceFixture, input);
  expect(fetch).toHaveBeenCalledWith("/api/services/service-1/billing-documents", {
    method: "POST", credentials: "include", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, version: 3 }),
  });
  expect(create).toHaveBeenCalledWith(blob);
  expect(downloaded).toBe("Angebot-012-SAN-2026.pdf");
  expect(revoke).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();
  expect(revoke).toHaveBeenCalledWith("blob:test");
});
it("reports validation errors without starting a download", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400,
    json: async () => ({ message: ["Ist-Zeiten fehlen.", "Preis fehlt."] }) }));
  await expect(exportBillingDocument(serviceFixture, input)).rejects.toThrow("Ist-Zeiten fehlen. · Preis fehlt.");
});
it("keeps a readable error when a proxy returns a non-JSON failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502,
    json: async () => { throw new Error("Invalid JSON"); } }));
  await expect(exportBillingDocument(serviceFixture, input)).rejects.toThrow("Das PDF konnte nicht erstellt werden.");
});
