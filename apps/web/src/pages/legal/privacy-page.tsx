import "./legal-page.css";
import { privacySections } from "./legal-content";
import { LegalSectionList } from "./legal-section-list";

export function PrivacyPage() {
  return <LegalSectionList sections={privacySections} />;
}
