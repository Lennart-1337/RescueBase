import { screen, waitFor, within } from "@testing-library/react";
import { changeValue, clickElement, mouseDownElement, postedBody, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

const admin = { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false };
const settings = {
  general: {
    appName: "RescueBase",
    appSubtitle: "Sanitätslager",
    showLogo: true,
    showAppName: false,
    showAppSubtitle: true,
    timezone: "Europe/Berlin",
    newUserOrderNotificationsDefaultEnabled: true
  },
  alerts: { dailyDigestEnabled: true, dailyDigestTime: "06:00", warningWindowDays: 90, lastDigestSentAt: null },
  inventory: { enabled: true, dailyReconcileTime: "02:00", lastReconciledAt: null },
  templates: [{
    key: "ALERT_DIGEST", subjectTemplate: "Tägliche Übersicht", introTemplate: "Guten Morgen", bodyTemplate: "{{alertCount}} offene Warnungen", allowedPlaceholders: ["alertCount"]
  }]
};

describe("SettingsPage", () => {
  afterEach(resetTestBrowser);

  it("loads and saves the app-wide configuration groups", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: admin },
      "/api/admin/settings": settings,
      "/api/admin/settings/general": { ...settings.general, appName: "RescueBase Pro", appSubtitle: "Bereitschaft Nord", showAppName: true, timezone: "Europe/Madrid" },
      "/api/admin/settings/alerts": { ...settings.alerts, dailyDigestTime: "07:30" },
      "/api/admin/settings/inventory": { ...settings.inventory, enabled: false }
    });
    await renderAppAt("/admin/settings");
    expect(await screen.findByRole("heading", { name: "App-Einstellungen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Allgemein" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kommunikation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Einstellungen/ })).toHaveClass("active");

    const general = screen.getByRole("region", { name: "Organisation und Zeit" });
    await changeValue(within(general).getByLabelText("App-Name"), "RescueBase Pro");
    await changeValue(within(general).getByLabelText("Untertitel"), "Bereitschaft Nord");
    const timezone = within(general).getByRole("combobox", { name: "Zeitzone" });
    await changeValue(timezone, "Madrid");
    expect(within(general).queryByRole("option", { name: "Europe/Berlin" })).not.toBeInTheDocument();
    await mouseDownElement(within(general).getByRole("option", { name: "Europe/Madrid" }));
    await clickElement(within(general).getByRole("checkbox", { name: "RescueBase-Schriftzug anzeigen" }));
    expect(timezone).toHaveValue("Europe/Madrid");
    await clickElement(within(general).getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(postedBody("/api/admin/settings/general")).toEqual({
      appName: "RescueBase Pro",
      appSubtitle: "Bereitschaft Nord",
      showLogo: true,
      showAppName: true,
      showAppSubtitle: true,
      timezone: "Europe/Madrid",
      newUserOrderNotificationsDefaultEnabled: true
    }));
    expect(screen.getByText("RescueBase Pro")).toBeInTheDocument();

    const alerts = screen.getByRole("region", { name: "Warnungen" });
    await changeValue(within(alerts).getByLabelText("Digest-Uhrzeit"), "07:30");
    await clickElement(within(alerts).getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(postedBody("/api/admin/settings/alerts")).toEqual({
      dailyDigestEnabled: true, dailyDigestTime: "07:30", warningWindowDays: 90
    }));

    const inventory = screen.getByRole("region", { name: "Lagerautomatik" });
    await clickElement(within(inventory).getByRole("checkbox", { name: "Automatische Bestandsprüfung aktiv" }));
    await clickElement(within(inventory).getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(postedBody("/api/admin/settings/inventory")).toEqual({ enabled: false, dailyReconcileTime: "02:00" }));
  });

  it("edits and previews operational email templates", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: admin },
      "/api/admin/settings": settings,
      "/api/admin/settings/templates/ALERT_DIGEST/preview": { subject: "Tägliche Übersicht", text: "Guten Morgen\n3 offene Warnungen", html: "<p>Guten Morgen</p><p>3 offene Warnungen</p>" },
      "/api/admin/settings/templates/ALERT_DIGEST": settings.templates[0]
    });
    await renderAppAt("/admin/settings");
    const templates = await screen.findByRole("region", { name: "E-Mail-Vorlagen" });
    await changeValue(within(templates).getByLabelText("Betreff"), "Warnungen: {{alertCount}}");
    await clickElement(within(templates).getByRole("button", { name: "Vorschau" }));
    expect(await within(templates).findByText(/3 offene Warnungen/)).toBeInTheDocument();
    await clickElement(within(templates).getByRole("button", { name: "Vorlage speichern" }));
    await waitFor(() => expect(postedBody("/api/admin/settings/templates/ALERT_DIGEST")).toEqual({
      subjectTemplate: "Warnungen: {{alertCount}}", introTemplate: "Guten Morgen", bodyTemplate: "{{alertCount}} offene Warnungen"
    }));
  });

  it("rejects direct access for non-admin users", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { ...admin, id: "warehouse", role: "WAREHOUSE" } }
    });
    await renderAppAt("/admin/settings");
    expect(await screen.findByText("Für App-Einstellungen ist eine Admin-Rolle erforderlich.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Einstellungen$/ })).not.toBeInTheDocument();
  });
});
