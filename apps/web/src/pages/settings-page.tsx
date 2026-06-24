import { useQuery } from "@tanstack/react-query";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { PageHeader, PageSection } from "../components/page-layout";
import { toError } from "../app/formatters";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { AlertSettingsPanel } from "./settings/alert-settings-panel";
import { GeneralSettingsPanel } from "./settings/general-settings-panel";
import { InventorySettingsPanel } from "./settings/inventory-settings-panel";
import { TemplateSettingsPanel } from "./settings/template-settings-panel";
import "./settings/settings-page.css";

export function SettingsPage({ user }: { user: AuthenticatedUser }) {
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: rescueBaseApi.adminSettings, enabled: user.role === "ADMIN" });
  if (user.role !== "ADMIN") return <ErrorPanel error={new Error("Für App-Einstellungen ist eine Admin-Rolle erforderlich.")} onRetry={() => undefined} />;
  if (settings.isLoading) return <LoadingPanel label="App-Einstellungen werden geladen" />;
  if (settings.isError || !settings.data) return <ErrorPanel error={toError(settings.error)} onRetry={() => void settings.refetch()} />;
  return (
    <div className="settings-page">
      <PageHeader title="App-Einstellungen" />
      <PageSection title="Allgemein">
        <div className="settings-stack">
          <GeneralSettingsPanel initial={settings.data.general} />
          <AlertSettingsPanel initial={settings.data.alerts} />
          <InventorySettingsPanel initial={settings.data.inventory} />
        </div>
      </PageSection>
      <PageSection title="Kommunikation">
        <TemplateSettingsPanel templates={settings.data.templates} />
      </PageSection>
    </div>
  );
}
