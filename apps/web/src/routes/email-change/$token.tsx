import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../../app/auth";
import { EmailChangeConfirmPage } from "../../pages/public-auth-pages";
import { publicQueries } from "../../queries/public";

export const Route = createFileRoute("/email-change/$token")({
  loader: ({ context, params }) => context.queryClient.prefetchQuery(publicQueries.emailChangePreview(params.token)),
  component: EmailChangeRoute
});

function EmailChangeRoute() {
  const { token } = Route.useParams();
  return <AuthScreen><EmailChangeConfirmPage token={token} /></AuthScreen>;
}
