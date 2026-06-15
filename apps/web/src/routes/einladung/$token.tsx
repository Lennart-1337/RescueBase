import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../../app/auth";
import { InvitationAcceptPage } from "../../pages/public-auth-pages";

export const Route = createFileRoute("/einladung/$token")({
  component: InvitationRoute
});

function InvitationRoute() {
  const { token } = Route.useParams();

  return (
    <AuthScreen>
      <InvitationAcceptPage token={token} />
    </AuthScreen>
  );
}
