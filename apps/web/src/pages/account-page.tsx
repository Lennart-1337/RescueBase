import type { AuthenticatedUser } from "../lib/types";
import { PageHeader, PageSection } from "../components/page-layout";
import { AccountAlertsPanel } from "./account/account-alerts-panel";
import { AccountEmailPanel } from "./account/account-email-panel";
import { AccountOrderNotificationsPanel } from "./account/account-order-notifications-panel";
import { AccountStatusPanel } from "./account/account-status-panel";
import { AccountTotpPanel } from "./account/account-totp-panel";

export function AccountPage({ user }: { user: AuthenticatedUser }) {
  return (
    <>
      <PageHeader description="Zugriffsschutz und persönliche Benachrichtigungen." title="Sicherheit" />
      <PageSection description="Anmeldung, E-Mail-Adresse und Zwei-Faktor-Schutz." title="Zugriffsschutz"><div className="admin-grid"><AccountStatusPanel user={user} /><AccountTotpPanel /><AccountEmailPanel /></div></PageSection>
      <PageSection description="Warnungen und Statusmeldungen, die Sie erhalten möchten." title="Benachrichtigungen"><AccountAlertsPanel /><div className="admin-grid account-notification-grid"><AccountOrderNotificationsPanel user={user} /></div></PageSection>
    </>
  );
}
