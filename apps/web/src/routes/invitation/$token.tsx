import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../../app/auth";
import { InvitationAcceptPage } from "../../pages/public-auth-pages";
import { publicQueries } from "../../queries/public";

export const Route = createFileRoute("/invitation/$token")({
  loader: ({ context, params }) => context.queryClient.prefetchQuery(publicQueries.invitation(params.token)),
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
