import type { ReactNode } from "react";
import { LegalLinks } from "./legal-links";
import { ThemeToggle } from "./theme";
import "./public-legal-layout.css";

export function PublicLegalLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="public-legal-layout">
      <section className="public-legal-content" aria-labelledby="legal-page-title">
        <header className="public-legal-header">
          <div>
            <span>RescueBase</span>
            <h1 id="legal-page-title">{title}</h1>
          </div>
          <ThemeToggle className="public-theme-toggle" />
        </header>
        {children}
        <LegalLinks />
      </section>
    </main>
  );
}
