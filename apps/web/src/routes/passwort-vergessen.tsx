import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../app/auth";
import { PasswordResetRequestPage } from "../pages/public-auth-pages";

export const Route = createFileRoute("/passwort-vergessen")({
  component: PasswordResetRequestRoute
});

function PasswordResetRequestRoute() {
  return (
    <AuthScreen>
      <PasswordResetRequestPage />
    </AuthScreen>
  );
}
