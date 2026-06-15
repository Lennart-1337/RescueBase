import { createFileRoute } from "@tanstack/react-router";
import { PublicCheck } from "../../pages/public-check-page";

export const Route = createFileRoute("/check/$token")({
  component: PublicCheckRoute
});

function PublicCheckRoute() {
  const { token } = Route.useParams();
  return <PublicCheck token={token} />;
}
