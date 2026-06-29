import { AnimatedRouteView } from "../motion/animated-containers";
import { InvitationAcceptScreen } from "./public-auth/invitation-accept-screen";
import { PasswordResetConfirmScreen } from "./public-auth/password-reset-confirm-screen";
import { PasswordResetRequestScreen } from "./public-auth/password-reset-request-screen";

export function InvitationAcceptPage({ token }: { token: string }) {
  return <AnimatedRouteView routeKey={`invitation:${token}`}><InvitationAcceptScreen token={token} /></AnimatedRouteView>;
}

export function PasswordResetRequestPage() {
  return <AnimatedRouteView routeKey="password-reset-request"><PasswordResetRequestScreen /></AnimatedRouteView>;
}

export function PasswordResetConfirmPage({ token }: { token: string }) {
  return <AnimatedRouteView routeKey={`password-reset-confirm:${token}`}><PasswordResetConfirmScreen token={token} /></AnimatedRouteView>;
}
