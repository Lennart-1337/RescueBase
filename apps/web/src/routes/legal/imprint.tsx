import { createFileRoute } from "@tanstack/react-router";
import { PublicLegalLayout } from "../../app/public-legal-layout";
import { ImprintPage } from "../../pages/legal/imprint-page";

export const Route = createFileRoute("/legal/imprint")({
  component: ImprintRoute
});

function ImprintRoute() {
  return (
    <PublicLegalLayout title="Impressum">
      <ImprintPage />
    </PublicLegalLayout>
  );
}
