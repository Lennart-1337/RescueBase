import { fireEvent, screen, waitFor } from "@testing-library/react";
import { changeValue, clickElement, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("Public auth pages", () => {
  afterEach(resetTestBrowser);

  it("submits invitation acceptance from the public invitation route", async () => {
    stubFetch({
      "/api/auth/invitations/token-123": { email: "lager-neu@rescuebase.local", displayName: "Neues Lagerteam", role: "WAREHOUSE" },
      "/api/auth/invitations/accept": { ok: true, user: { id: "user-neu", email: "lager-neu@rescuebase.local", displayName: "Lager Nord", role: "WAREHOUSE", twoFactorEnabled: false } }
    });
    await renderAppAt("/invitation/token-123");
    await screen.findByRole("heading", { name: "Einladung annehmen" });
    await changeValue(screen.getByLabelText("Name"), "Lager Nord");
    await changeValue(screen.getByLabelText("Passwort"), "rescuebase-neu");
    await changeValue(screen.getByLabelText("Passwort wiederholen"), "rescuebase-neu");
    await clickElement(screen.getByRole("button", { name: /Konto aktivieren/ }));
    await waitFor(() => expect(postedBody("/api/auth/invitations/accept")).toEqual({ token: "token-123", password: "rescuebase-neu", displayName: "Lager Nord" }));
  });

  it("submits password reset requests from the public reset screen", async () => {
    stubFetch({ "/api/auth/password-reset/request": { ok: true, debugUrl: "http://localhost:5173/password-reset/reset-123" } });
    await renderAppAt("/password-reset");
    await screen.findByRole("heading", { name: "Passwort zurücksetzen" });
    await changeValue(screen.getByLabelText("E-Mail"), "lager-neu@rescuebase.local");
    await clickElement(screen.getByRole("button", { name: /Reset-Link senden/ }));
    await waitFor(() => expect(postedBody("/api/auth/password-reset/request")).toEqual({ email: "lager-neu@rescuebase.local" }));
    expect(screen.getByText(/Lokaler Reset-Link/)).toBeInTheDocument();
  });

  it("autofocuses login and submits it through the form", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {},
      "/api/auth/login": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } }
    });
    await renderAppAt("/");
    const emailInput = await screen.findByLabelText("E-Mail");
    expect(emailInput).toHaveFocus();

    await changeValue(emailInput, "admin@rescuebase.local");
    await changeValue(screen.getByLabelText("Passwort"), "rescuebase-admin");
    fireEvent.submit(screen.getByRole("button", { name: "Anmelden" }).closest("form") as HTMLFormElement);

    await waitFor(() => expect(postedBody("/api/auth/login")).toEqual({
      email: "admin@rescuebase.local",
      password: "rescuebase-admin"
    }));
  });

  it("shows legal links on the public auth screen", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {}
    });
    await renderAppAt("/");

    expect(await screen.findByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/legal/imprint");
    expect(screen.getByRole("link", { name: "Datenschutzerklärung" })).toHaveAttribute("href", "/legal/privacy");
  });

  it("restores a pending 2FA login after the browser state is recreated", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord", showLogo: true, showAppName: false, showAppSubtitle: true },
      "/api/auth/session": {},
      "/api/auth/login": { requiresTwoFactor: true, twoFactorMethod: "EMAIL", loginChallengeId: "challenge-1", debugCode: "123456" }
    });
    await renderAppAt("/");
    expect(await screen.findByText("Bereitschaft Nord")).toBeInTheDocument();
    expect(screen.getByAltText("DLRG Logo")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Anmelden" });
    await changeValue(screen.getByLabelText("E-Mail"), "lager-neu@rescuebase.local");
    await changeValue(screen.getByLabelText("Passwort"), "rescuebase-neu-2");
    await clickElement(screen.getByRole("button", { name: "Anmelden" }));
    await screen.findByLabelText("2FA-Code");

    vi.restoreAllMocks();
    history.pushState({}, "", "/");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord", showLogo: true, showAppName: false, showAppSubtitle: true },
      "/api/auth/session": {}
    });
    await renderAppAt("/");
    expect(await screen.findByLabelText("2FA-Code")).toHaveFocus();
    expect(screen.queryByLabelText("Passwort")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail")).toHaveValue("lager-neu@rescuebase.local");
  });

  it("shows legal links in the admin content footer", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord", showLogo: true, showAppName: false, showAppSubtitle: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false }, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord", showLogo: true, showAppName: false, showAppSubtitle: true },
      "/api/catalog/kits": [],
      "/api/inventory/batches": [],
      "/api/replenishment-orders": []
    });
    await renderAppAt("/");

    const imprintLinks = await screen.findAllByRole("link", { name: "Impressum" });
    const privacyLinks = screen.getAllByRole("link", { name: "Datenschutzerklärung" });

    expect(imprintLinks.at(-1)).toHaveAttribute("href", "/legal/imprint");
    expect(privacyLinks.at(-1)).toHaveAttribute("href", "/legal/privacy");
  });
});
