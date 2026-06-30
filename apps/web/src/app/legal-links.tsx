import { Link } from "@tanstack/react-router";
import "./legal-links.css";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches" className={className ? `legal-links ${className}` : "legal-links"}>
      <Link to="/legal/imprint">Impressum</Link>
      <Link to="/legal/privacy">Datenschutzerklärung</Link>
    </nav>
  );
}
