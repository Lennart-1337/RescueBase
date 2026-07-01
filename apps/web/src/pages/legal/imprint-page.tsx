import "./legal-page.css";
import { imprintSections } from "./legal-content";
import { LegalSectionList } from "./legal-section-list";

export function ImprintPage() {
  return <LegalSectionList sections={imprintSections} />;
}
