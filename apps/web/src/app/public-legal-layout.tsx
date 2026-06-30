import type { ReactNode } from "react";
import { LegalLinks } from "./legal-links";
import "./public-legal-layout.css";

export function PublicLegalLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="public-legal-layout">
      <section className="public-legal-content" aria-labelledby="legal-page-title">
        <header className="public-legal-header">
          <span>RescueBase</span>
          <h1 id="legal-page-title">{title}</h1>
        </header>
        {children}
        <LegalLinks />
      </section>
    </main>
  );
}
