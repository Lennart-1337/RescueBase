import type { AuthenticatedUser } from "../lib/types";
import { PageHeader, PageSection } from "../components/page-layout";
import { AccountAlertsPanel } from "./account/account-alerts-panel";
import { AccountEmailPanel } from "./account/account-email-panel";
import { AccountOrderNotificationsPanel } from "./account/account-order-notifications-panel";
import { AccountStatusPanel } from "./account/account-status-panel";
import { AccountTotpPanel } from "./account/account-totp-panel";
import "./account-page.css";

export function AccountPage({ user }: { user: AuthenticatedUser }) {
  return (
    <>
      <PageHeader title="Sicherheit" />
      <PageSection title="Zugriffsschutz"><div className="admin-grid account-access-grid"><AccountStatusPanel user={user} /><AccountTotpPanel /><AccountEmailPanel /></div></PageSection>
      <PageSection title="Benachrichtigungen"><AccountAlertsPanel /><div className="admin-grid account-notification-grid"><AccountOrderNotificationsPanel user={user} /></div></PageSection>
    </>
  );
}
