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
    await renderAppAt("/admin/user-management");
    await screen.findByRole("heading", { name: "Benutzerverwaltung" });
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
    await renderAppAt("/admin/user-management");
    await screen.findByRole("heading", { name: "Benutzerverwaltung" });
    await clickElement(screen.getByText("Lagerteam"));
    await clickElement(screen.getByRole("tab", { name: "Zugang" }));
    await clickElement(screen.getByRole("button", { name: "Konto löschen" }));
    await waitFor(() => expect(wasRequested("/api/auth/users/user-lager", "DELETE")).toBe(true));
  });

  it("updates another user's profile and role from one edit dialog", async () => {
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
    await renderAppAt("/admin/user-management");
    await screen.findByRole("heading", { name: "Benutzerverwaltung" });

    await clickElement(screen.getByText("Lagerteam"));
    await clickElement(screen.getByRole("button", { name: "Profil bearbeiten" }));
    const dialog = await screen.findByRole("dialog", { name: "Benutzer bearbeiten" });
    expect(within(dialog).getByLabelText("Rolle")).toHaveValue("Lagerwart");

    await changeValue(within(dialog).getByLabelText("Rolle"), "Admin");
    await mouseDownElement(screen.getByRole("option", { name: "Admin" }));
    expect(within(dialog).getByLabelText("Rolle")).toHaveValue("Admin");
    await clickElement(within(dialog).getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => expect(postedBody("/api/auth/users/user-lager/profile")).toEqual({ displayName: "Lagerteam", email: "lager@rescuebase.local", role: "ADMIN" }));
    await waitFor(() => expect(postedBody("/api/auth/users/user-lager/role")).toEqual({ role: "ADMIN" }));
  });

  it("offers account activation controls for the selected account", async () => {
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

    await renderAppAt("/admin/user-management");
    await screen.findByRole("heading", { name: "Benutzerverwaltung" });

    await clickElement(screen.getByText("Lagerteam"));
    await clickElement(screen.getByRole("tab", { name: "Zugang" }));
    expect(screen.getByRole("button", { name: "Konto deaktivieren" })).toBeEnabled();
    await clickElement(screen.getByText("Mobile Test"));
    expect(screen.getByRole("button", { name: "Konto aktivieren" })).toBeEnabled();
  });

  it("shows invitation and session status and manages profile and security actions", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/users": [
        { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false, sessionCount: 1 },
        { id: "user-managed", email: "managed@rescuebase.local", displayName: "Managed User", role: "WAREHOUSE", active: false, twoFactorEnabled: true, twoFactorMethod: "TOTP", sessionCount: 2, invitationStatus: "OPEN", pendingEmail: "managed-new@rescuebase.local" }
      ],
      "/api/auth/users/user-managed/profile": { ok: true, emailChangeRequested: true },
      "/api/auth/users/user-managed/sessions/revoke": { ok: true },
      "/api/alerts/subscriptions": []
    });

    await renderAppAt("/admin/user-management");
    await screen.findByText("Einladung offen");
    await clickElement(screen.getByText("Managed User"));
    await clickElement(screen.getByRole("tab", { name: "Zugang" }));
    expect(screen.getByText("2")).toBeInTheDocument();

    await clickElement(screen.getByRole("tab", { name: "Profil" }));
    await clickElement(screen.getByRole("button", { name: "Profil bearbeiten" }));
    const profileDialog = await screen.findByRole("dialog", { name: "Benutzer bearbeiten" });
    await changeValue(within(profileDialog).getByLabelText("Name"), "Managed Team");
    await clickElement(within(profileDialog).getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(postedBody("/api/auth/users/user-managed/profile")).toEqual({ displayName: "Managed Team", email: "managed@rescuebase.local", role: "WAREHOUSE" }));

    await clickElement(screen.getByRole("tab", { name: "Sicherheit" }));
    await clickElement(screen.getByRole("button", { name: "Sicherheit verwalten" }));
    const securityDialog = await screen.findByRole("dialog", { name: "Kontosicherheit" });
    await clickElement(within(securityDialog).getByRole("button", { name: "Alle Sitzungen beenden" }));
    await waitFor(() => expect(wasRequested("/api/auth/users/user-managed/sessions/revoke", "POST")).toBe(true));
  });

  it("renders roles and alert recipients in the account overview", async () => {
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

    await renderAppAt("/admin/user-management");
    await screen.findByRole("heading", { name: "Benutzerverwaltung" });

    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    expect(screen.getByText("Lagerwart")).toBeInTheDocument();
    expect(screen.getByText("Kontodetails")).toBeInTheDocument();
  });
});
