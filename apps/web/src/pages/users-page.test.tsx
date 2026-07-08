import { screen, waitFor, within } from "@testing-library/react";
import { changeValue, clickElement, mouseDownElement, postedBody, renderAppAt, resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

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

  it("changes another user's role as admin", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [
        { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false },
        { id: "user-lager", email: "lager@rescuebase.local", displayName: "Lagerteam", role: "WAREHOUSE", active: true, twoFactorEnabled: false }
      ],
      "/api/auth/users/user-lager/role": { ok: true },
      "/api/alerts/subscriptions": []
    });
    await renderAppAt("/admin/users");
    await screen.findByRole("heading", { name: "Benutzer" });

    await clickElement(screen.getByRole("button", { name: /Lagerteam Rolle ändern/ }));
    const dialog = await screen.findByRole("dialog", { name: "Rolle ändern" });
    expect(within(dialog).getByLabelText("Benutzer")).toHaveValue("Lagerteam");
    expect(within(dialog).getByLabelText("Rolle")).toHaveValue("Lagerwart");

    await changeValue(within(dialog).getByLabelText("Rolle"), "Admin");
    await mouseDownElement(screen.getByRole("option", { name: "Admin" }));
    await clickElement(within(dialog).getByRole("button", { name: "Rolle speichern" }));

    await waitFor(() => expect(postedBody("/api/auth/users/user-lager/role")).toEqual({ role: "ADMIN" }));
  });

  it("uses the same width class for activate and deactivate actions", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [
        { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false },
        { id: "user-lager", email: "lager@rescuebase.local", displayName: "Lagerteam", role: "WAREHOUSE", active: true, twoFactorEnabled: false },
        { id: "user-pending", email: "pending@rescuebase.local", displayName: "Mobile Test", role: "WAREHOUSE", active: false, twoFactorEnabled: false }
      ],
      "/api/alerts/subscriptions": []
    });

    await renderAppAt("/admin/users");
    await screen.findByRole("heading", { name: "Benutzer" });

    for (const button of screen.getAllByRole("button", { name: "Deaktivieren" })) {
      expect(button).toHaveClass("user-toggle-button");
    }
    expect(screen.getByRole("button", { name: "Aktivieren" })).toHaveClass("user-toggle-button");
  });

  it("renders role and alert recipient badges with neutral styling", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [
        { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false },
        { id: "user-lager", email: "lager@rescuebase.local", displayName: "Lagerteam", role: "WAREHOUSE", active: true, twoFactorEnabled: false }
      ],
      "/api/alerts/subscriptions": [
        {
          id: "subscription-expiry",
          category: "SHORTAGE",
          locationName: null,
          user: { id: "user-admin", displayName: "Admin", email: "admin@rescuebase.local" }
        }
      ]
    });

    await renderAppAt("/admin/users");
    await screen.findByRole("heading", { name: "Benutzer" });

    const adminRow = screen.getByText("admin@rescuebase.local").closest(".user-row");
    expect(adminRow).not.toBeNull();
    const adminRoleBadge = (adminRow as HTMLElement).querySelector(".badge");
    expect(adminRoleBadge).not.toBeNull();
    expect(adminRoleBadge).toHaveClass("badge-neutral");

    const warehouseRow = screen.getByText("Lagerteam").closest(".user-row");
    expect(warehouseRow).not.toBeNull();
    const warehouseRoleBadge = within(warehouseRow as HTMLElement).getByText("Lagerwart").closest(".badge");
    expect(warehouseRoleBadge).not.toBeNull();
    expect(warehouseRoleBadge).toHaveClass("badge-neutral");

    await screen.findByText("SHORTAGE");
    const alertRow = document.querySelector(".compact-list-row");
    expect(alertRow).not.toBeNull();
    const alertBadge = within(alertRow as HTMLElement).getByText("SHORTAGE").closest(".badge");
    expect(alertBadge).not.toBeNull();
    expect(alertBadge).toHaveClass("badge-neutral");
  });
});
