import type { ReactNode } from "react";
import { type AppBranding } from "../branding";
import { BrandMark } from "../brand-mark";
import { LegalLinks } from "../legal-links";
import { ThemeToggle } from "../theme";
import "../brand-mark.css";
import "./auth-screen.css";

const defaultBranding: AppBranding = {
  appName: "RescueBase",
  appSubtitle: "Sanitätslager",
  showLogo: true,
  showAppName: false,
  showAppSubtitle: true
};

export function AuthScreen({
  children,
  branding = defaultBranding,
  showThemeToggle = true
}: {
  children: ReactNode;
  branding?: AppBranding;
  showThemeToggle?: boolean;
}) {
  return (
    <main className="auth-screen">
      {showThemeToggle ? (
        <div className="auth-screen-toolbar">
          <ThemeToggle className="public-theme-toggle" />
        </div>
      ) : null}
      <section className="auth-brand">
        {branding.showLogo ? <div className="brand-mark"><BrandMark /></div> : null}
        {branding.showAppName ? <strong>{branding.appName}</strong> : null}
        {branding.showAppSubtitle ? <p>{branding.appSubtitle}</p> : null}
      </section>
      <div className="auth-content">
        {children}
        <LegalLinks />
      </div>
    </main>
  );
}
