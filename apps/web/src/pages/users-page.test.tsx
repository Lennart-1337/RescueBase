import { screen, waitFor, within } from "@testing-library/react";
import { changeValue, clickElement, postedBody, renderAppAt, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

describe("UsersPage", () => {
  afterEach(resetTestBrowser);

  it("invites users from a modal dialog", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [{ id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false }],
      "/api/auth/invite": { invitationUrl: "https://example.test/invite", debugUrl: "http://localhost/debug-invite" },
      "/api/alerts/subscriptions": []
    });
    await renderAppAt("/admin/users");
    await screen.findByRole("heading", { name: "Benutzer" });
    expect(screen.getByRole("button", { name: /Benutzer einladen/ }).closest(".topbar")).not.toBeNull();
    await clickElement(screen.getByRole("button", { name: /Benutzer einladen/ }));
    const dialog = await screen.findByRole("dialog", { name: "Benutzer einladen" });
    expect(within(dialog).getByLabelText("Name")).toHaveFocus();
    expect(within(dialog).queryByText("Nur Admins können Einladungen verwalten.")).toBeNull();
    expect(within(dialog).queryByText("Einladungen laufen per E-Mail-Link mit eigenem Passwort-Setup.")).toBeNull();
    await changeValue(within(dialog).getByLabelText("Name"), "Lager Nord");
    await changeValue(within(dialog).getByLabelText("E-Mail"), "lager@rescuebase.local");
    await clickElement(within(dialog).getByRole("button", { name: /Einladung senden/ }));
    await waitFor(() => expect(postedBody("/api/auth/invite")).toEqual({ displayName: "Lager Nord", email: "lager@rescuebase.local", role: "WAREHOUSE" }));
  });

  it("soft-deletes users after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [
        { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false },
        { id: "user-lager", email: "lager@rescuebase.local", displayName: "Lagerteam", role: "WAREHOUSE", active: true, twoFactorEnabled: false }
      ],
      "/api/auth/users/user-lager": { ok: true },
      "/api/alerts/subscriptions": []
    });
    await renderAppAt("/admin/users");
    await screen.findByRole("heading", { name: "Benutzer" });
    await clickElement(screen.getByRole("button", { name: /Lagerteam löschen/ }));
    await waitFor(() => expect(wasRequested("/api/auth/users/user-lager", "DELETE")).toBe(true));
  });
});
