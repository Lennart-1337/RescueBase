import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../../app/auth";
import { PasswordResetConfirmPage } from "../../pages/public-auth-pages";
import { publicQueries } from "../../queries/public";

export const Route = createFileRoute("/password-reset/$token")({
  loader: ({ context, params }) => context.queryClient.prefetchQuery(publicQueries.passwordResetPreview(params.token)),
  component: PasswordResetConfirmRoute
});

function PasswordResetConfirmRoute() {
  const { token } = Route.useParams();

  return (
    <AuthScreen>
      <PasswordResetConfirmPage token={token} />
    </AuthScreen>
  );
}
