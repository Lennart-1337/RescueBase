import { screen, waitFor } from "@testing-library/react";
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

  it("restores a pending 2FA login after the browser state is recreated", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {},
      "/api/auth/login": { requiresTwoFactor: true, twoFactorMethod: "EMAIL", loginChallengeId: "challenge-1", debugCode: "123456" }
    });
    await renderAppAt("/");
    await screen.findByRole("heading", { name: "Anmelden" });
    await changeValue(screen.getByLabelText("E-Mail"), "lager-neu@rescuebase.local");
    await changeValue(screen.getByLabelText("Passwort"), "rescuebase-neu-2");
    await clickElement(screen.getByRole("button", { name: "Anmelden" }));
    await screen.findByLabelText("2FA-Code");

    vi.restoreAllMocks();
    history.pushState({}, "", "/");
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": {}
    });
    await renderAppAt("/");
    expect(await screen.findByLabelText("2FA-Code")).toBeInTheDocument();
    expect(screen.queryByLabelText("Passwort")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail")).toHaveValue("lager-neu@rescuebase.local");
  });
});
