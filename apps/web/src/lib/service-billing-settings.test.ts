import { getServiceBillingSettings, saveServiceBillingSettings } from "./service-billing-settings";
import { billingSettingsFixture } from "../pages/settings/service-billing/test-fixture";
afterEach(() => vi.unstubAllGlobals());
it("fetches the admin settings using the authenticated session", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(billingSettingsFixture), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await getServiceBillingSettings()).toEqual(billingSettingsFixture);
  expect(fetchMock).toHaveBeenCalledWith("/api/admin/settings/service-billing", { credentials: "include", headers: {} });
});
it("posts all settings and the optimistic-lock version", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...billingSettingsFixture, version: 3 }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  expect((await saveServiceBillingSettings(billingSettingsFixture)).version).toBe(3);
  expect(fetchMock).toHaveBeenCalledWith("/api/admin/settings/service-billing", expect.objectContaining({
    credentials: "include", method: "POST", body: JSON.stringify(billingSettingsFixture),
  }));
});
it("exposes validation and conflict messages without hiding HTTP status", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Zwischenzeitlich geändert. Bitte neu laden." }), { status: 409, headers: { "content-type": "application/json" } })));
  await expect(saveServiceBillingSettings(billingSettingsFixture)).rejects.toMatchObject({ status: 409, message: "Zwischenzeitlich geändert. Bitte neu laden." });
});
