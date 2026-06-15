import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../../app/auth";
import { PasswordResetConfirmPage } from "../../pages/public-auth-pages";

export const Route = createFileRoute("/password-reset/$token")({
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
