import { createFileRoute } from "@tanstack/react-router";
import { PublicLegalLayout } from "../../app/public-legal-layout";
import { PrivacyPage } from "../../pages/legal/privacy-page";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyRoute
});

function PrivacyRoute() {
  return (
    <PublicLegalLayout title="Datenschutzerklärung">
      <PrivacyPage />
    </PublicLegalLayout>
  );
}
