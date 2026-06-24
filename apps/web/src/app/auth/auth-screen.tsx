import type { ReactNode } from "react";
import type { AppBranding } from "../branding";

const defaultBranding: AppBranding = { appName: "RescueBase", appSubtitle: "Sanitätslager" };

export function AuthScreen({ children, branding = defaultBranding }: { children: ReactNode; branding?: AppBranding }) {
  return (
    <main className="auth-screen">
      <section className="auth-brand">
        <div className="brand-mark">RB</div>
        <h1>{branding.appName}</h1>
        <p>{branding.appSubtitle}</p>
      </section>
      {children}
    </main>
  );
}
