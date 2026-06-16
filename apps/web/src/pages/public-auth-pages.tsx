import { InvitationAcceptScreen } from "./public-auth/invitation-accept-screen";
import { PasswordResetConfirmScreen } from "./public-auth/password-reset-confirm-screen";
import { PasswordResetRequestScreen } from "./public-auth/password-reset-request-screen";

export function InvitationAcceptPage({ token }: { token: string }) {
  return <InvitationAcceptScreen token={token} />;
}

export function PasswordResetRequestPage() {
  return <PasswordResetRequestScreen />;
}

export function PasswordResetConfirmPage({ token }: { token: string }) {
  return <PasswordResetConfirmScreen token={token} />;
}
