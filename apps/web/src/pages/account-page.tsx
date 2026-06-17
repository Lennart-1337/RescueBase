import type { AuthenticatedUser } from "../lib/types";
import { AccountAlertsPanel } from "./account/account-alerts-panel";
import { AccountEmailPanel } from "./account/account-email-panel";
import { AccountStatusPanel } from "./account/account-status-panel";
import { AccountTotpPanel } from "./account/account-totp-panel";

export function AccountPage({ user }: { user: AuthenticatedUser }) {
  return (
    <>
      <header className="topbar"><div><h1>Sicherheit</h1><p>Passwortbasierter Login mit TOTP oder E-Mail-Code als zweitem Faktor.</p></div></header>
      <section className="admin-grid">
        <AccountStatusPanel user={user} />
        <AccountTotpPanel />
      </section>
      <AccountAlertsPanel />
      <AccountEmailPanel />
    </>
  );
}
