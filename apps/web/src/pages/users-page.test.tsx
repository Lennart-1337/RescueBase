import { screen, waitFor, within } from "@testing-library/react";
import { changeValue, clickElement, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("UsersPage", () => {
  afterEach(resetTestBrowser);

  it("invites users from a modal dialog", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [{ id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false }],
      "/api/auth/invite": { invitationUrl: "https://example.test/invite", debugUrl: "http://localhost/debug-invite" }
    });
    await renderAppAt("/admin/users");
    await screen.findByRole("heading", { name: "Benutzer" });
    await clickElement(screen.getByRole("button", { name: /Benutzer einladen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Benutzer einladen" });
    await changeValue(within(dialog).getByLabelText("Name"), "Lager Nord");
    await changeValue(within(dialog).getByLabelText("E-Mail"), "lager@rescuebase.local");
    await clickElement(within(dialog).getByRole("button", { name: /Einladung senden/ }));
    await waitFor(() => expect(postedBody("/api/auth/invite")).toEqual({ displayName: "Lager Nord", email: "lager@rescuebase.local", role: "WAREHOUSE" }));
  });
});
