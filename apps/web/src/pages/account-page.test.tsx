import { screen, within } from "@testing-library/react";
import { clickElement, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("AccountPage", () => {
  afterEach(resetTestBrowser);

  it("renders a TOTP QR code after preparing 2FA", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/2fa/totp/setup": { secret: "ABCDEF123456", otpauthUrl: "otpauth://totp/RescueBase:admin@rescuebase.local?secret=ABCDEF123456&issuer=RescueBase" },
      "/api/catalog/locations": [],
      "/api/alerts/subscriptions/me": []
    });
    await renderAppAt("/admin/account");
    expect((await screen.findByRole("heading", { name: "Zugriffsschutz" })).closest(".page-section")?.querySelector(".account-access-grid")).not.toBeNull();
    await clickElement(await screen.findByRole("button", { name: /TOTP vorbereiten/ }));
    expect(await screen.findByAltText("TOTP-QR-Code")).toBeInTheDocument();
    expect(screen.getByText("ABCDEF123456")).toBeInTheDocument();
  });

  it("saves alert preferences from the account page", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/locations": [{ id: "loc-main", name: "Hauptlager", kind: "STORAGE" }],
      "/api/alerts/subscriptions/me": []
    });
    await renderAppAt("/admin/account");
    const globalCheckbox = (await screen.findAllByRole("checkbox", { name: /Alle Standorte/ }))[0]!;
    await clickElement(globalCheckbox);
    expect(await screen.findByText("1 Regel aktiv")).toBeInTheDocument();
  });

  it("groups alarm preferences by category with clear global and location choices", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/locations": [
        { id: "loc-main", name: "Hauptlager", kind: "STORAGE" },
        { id: "loc-home", name: "zu Hause", kind: "STORAGE" }
      ],
      "/api/alerts/subscriptions/me": []
    });

    await renderAppAt("/admin/account");

    const expiryGroup = await screen.findByRole("group", { name: "Ablauf" });
    const header = expiryGroup.querySelector(".alert-category-card-header");
    expect(header).not.toBeNull();
    expect(within(header as HTMLElement).getByRole("heading", { name: "Ablauf" })).toBeInTheDocument();
    expect(within(header as HTMLElement).getByText("0 aktiv")).toBeInTheDocument();
    expect(within(expiryGroup).getByRole("checkbox", { name: /Alle Standorte/ })).toBeInTheDocument();
    expect(within(expiryGroup).getByRole("checkbox", { name: /Hauptlager/ })).toBeInTheDocument();
    expect(within(expiryGroup).getByRole("checkbox", { name: /zu Hause/ })).toBeInTheDocument();
  });

  it("saves the order mail preference from the account page", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false, newOrderNotificationsEnabled: false } },
      "/api/catalog/locations": [],
      "/api/alerts/subscriptions/me": [],
      "/api/auth/preferences/order-notifications": { ok: true, user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false, newOrderNotificationsEnabled: true } }
    });

    await renderAppAt("/admin/account");
    const panel = (await screen.findByRole("heading", { name: "Auftrags-E-Mails" })).closest("section") as HTMLElement;
    expect(panel.closest(".account-notification-grid")).not.toBeNull();
    await clickElement(within(panel).getByRole("checkbox", { name: /Neue Nachfüllaufträge per E-Mail senden/ }));
    await clickElement(within(panel).getByRole("button", { name: "Speichern" }));
  });
});
