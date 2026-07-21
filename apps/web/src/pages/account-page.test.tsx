import { screen, within } from "@testing-library/react";
import { changeValue, clickElement, renderAppAt, requestBody, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

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
    await changeValue((await screen.findAllByLabelText("Aktuelles Passwort"))[0]!, "rescuebase-admin");
    expect((await screen.findByRole("heading", { name: "Zugriffsschutz" })).closest(".page-section")?.querySelector(".account-access-grid")).not.toBeNull();
    await clickElement(await screen.findByRole("button", { name: /TOTP vorbereiten/ }));
    expect(await screen.findByAltText("TOTP-QR-Code")).toBeInTheDocument();
    expect(screen.getByText("ABCDEF123456")).toBeInTheDocument();
    expect(screen.getByLabelText("TOTP-Code")).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("marks the mail challenge field as a one-time code input", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/2fa/email/start": { challengeId: "email-challenge-1", debugCode: "654321" },
      "/api/catalog/locations": [],
      "/api/alerts/subscriptions/me": []
    });

    await renderAppAt("/admin/account");
    await changeValue((await screen.findAllByLabelText("Aktuelles Passwort"))[1]!, "rescuebase-admin");
    await clickElement(await screen.findByRole("button", { name: "Code senden" }));

    expect(await screen.findByLabelText("E-Mail-Code")).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("uses the dedicated status action layout for the 2FA disable button", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: true, twoFactorMethod: "EMAIL" } },
      "/api/catalog/locations": [],
      "/api/alerts/subscriptions/me": []
    });

    await renderAppAt("/admin/account");

    const button = await screen.findByRole("button", { name: "2FA deaktivieren" });
    expect(button.closest(".account-status-actions")).not.toBeNull();
    expect(button.closest(".account-status-body")).not.toBeNull();
    const statusPanel = button.closest(".account-status-panel") as HTMLElement;
    expect(within(statusPanel).getByLabelText("Aktuelles Passwort").closest(".account-status-password-field")).not.toBeNull();
    expect(screen.getByText("2FA EMAIL").closest(".badge")).toHaveClass("badge-ready");
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
    expect(screen.getByText("1 Regel aktiv").closest(".badge")).toHaveClass("badge-neutral");
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
    expect(within(header as HTMLElement).getByText("0 aktiv").closest(".badge")).toHaveClass("badge-neutral");
    expect(within(expiryGroup).getByRole("checkbox", { name: /Alle Standorte/ })).toBeInTheDocument();
    expect(within(expiryGroup).getByRole("checkbox", { name: /Hauptlager/ })).toBeInTheDocument();
    expect(within(expiryGroup).getByRole("checkbox", { name: /zu Hause/ })).toBeInTheDocument();
    expect(await screen.findByRole("group", { name: "Fehlbestand" })).toBeInTheDocument();
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

  it("enables all push notifications for the current browser", async () => {
    const subscription = { endpoint: "https://push.example.org/subscriptions/device-1", expirationTime: null, toJSON: () => ({ keys: { auth: "auth-key", p256dh: "p256dh-key" } }), unsubscribe: vi.fn().mockResolvedValue(true) };
    const pushManager = { getSubscription: vi.fn().mockResolvedValueOnce(null).mockResolvedValue(subscription), subscribe: vi.fn().mockResolvedValue(subscription) };
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(window, "PushManager", { configurable: true, value: class PushManager {} });
    Object.defineProperty(window, "Notification", { configurable: true, value: { requestPermission: vi.fn().mockResolvedValue("granted") } });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: vi.fn().mockResolvedValue({ pushManager }) } });
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/catalog/locations": [],
      "/api/alerts/subscriptions/me": [],
      "/api/push/config": { enabled: true, publicKey: "BEl6sGe2zCNxzyu2WQwo5XBmhGuVJ9By0DxwYhucPzQdV0aQJ42T7e1zNPp5PvYx6N6WmXv3mM4aN5bQv4rKxY" },
      "/api/push/subscriptions/me": { endpoints: [] },
      "/api/push/subscriptions": { ok: true }
    });

    await renderAppAt("/admin/account");
    await clickElement(await screen.findByRole("button", { name: "Push-Benachrichtigungen aktivieren" }));

    expect(requestBody("/api/push/subscriptions", "POST")).toEqual({ endpoint: subscription.endpoint, expirationTime: null, keys: { auth: "auth-key", p256dh: "p256dh-key" } });
  });
});
