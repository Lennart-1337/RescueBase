import { fireEvent, screen } from "@testing-library/react";
import { renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

const routes = {
  "/api/auth/setup/status": { initialized: true },
  "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
  "/api/auth/users": [{ id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", active: true, twoFactorEnabled: false }],
  "/api/alerts/subscriptions": []
};

describe("user management routes", () => {
  afterEach(resetTestBrowser);

  it("shows the new user management as the primary admin destination", async () => {
    stubFetch(routes);
    await renderAppAt("/admin/user-management");

    expect(await screen.findByRole("heading", { name: "Benutzerverwaltung" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Benutzerverwaltung" })).toHaveAttribute("href", "/admin/user-management");
    expect(screen.getByText("Einladungen offen")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Benutzerseiten" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kontodetails" })).toBeInTheDocument();
  });

  it("keeps the prior view available and visibly marks it as legacy", async () => {
    stubFetch(routes);
    await renderAppAt("/admin/users");

    expect(await screen.findByRole("heading", { name: "Benutzerverwaltung (Legacy)" })).toBeInTheDocument();
    expect(screen.getByText(/wird nach der Abnahme dieser Release-Phase entfernt/i)).toBeInTheDocument();
  });

  it("paginates user accounts", async () => {
    const users = Array.from({ length: 11 }, (_, index) => ({ active: true, displayName: `Benutzer ${index + 1}`, email: `user${index + 1}@rescuebase.local`, id: `user-${index + 1}`, role: "WAREHOUSE" as const, twoFactorEnabled: false }));
    stubFetch({ ...routes, "/api/auth/users": users });
    await renderAppAt("/admin/user-management");

    fireEvent.click(await screen.findByRole("button", { name: "Nächste Seite" }));
    expect(screen.getByText("11-11 von 11")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "user-11 auswählen Benutzer 11user11@rescuebase.local Lagerwart Aktiv Offen Nicht eingerichtet Noch nie" })).toBeInTheDocument();
  });

  it("shows the active sorting direction in the column header", async () => {
    stubFetch(routes);
    await renderAppAt("/admin/user-management");

    fireEvent.click(await screen.findByRole("button", { name: "Benutzer sortieren" }));
    expect(screen.getByRole("columnheader", { name: "Benutzer" })).toHaveAttribute("aria-sort", "ascending");
  });

  it("places account actions in their corresponding detail tab", async () => {
    const users = [...routes["/api/auth/users"], { active: true, displayName: "Lagerteam", email: "lager@rescuebase.local", id: "user-lager", role: "WAREHOUSE" as const, twoFactorEnabled: false }];
    stubFetch({ ...routes, "/api/auth/users": users });
    await renderAppAt("/admin/user-management");

    fireEvent.click(await screen.findByText("Lagerteam"));
    expect(screen.getByRole("button", { name: "Profil bearbeiten" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Konto deaktivieren" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Zugang" }));
    expect(screen.queryByRole("button", { name: "Profil bearbeiten" })).toBeNull();
    expect(screen.getByRole("button", { name: "Konto deaktivieren" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Sicherheit" }));
    expect(screen.queryByRole("button", { name: "Konto deaktivieren" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sicherheit verwalten" })).toBeInTheDocument();
  });
});
