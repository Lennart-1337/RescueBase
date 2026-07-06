import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import type { AuthenticatedUser } from "../lib/types";
import { authKeys, authQueries } from "../queries/auth";
import type { AppBranding } from "./branding";
import { useDocumentTitle } from "./document-title";
import { toError } from "./formatters";
import { AuthScreen } from "./auth/auth-screen";
import { LoginForm } from "./auth/login-form";
import { SetupForm } from "./auth/setup-form";

export { AuthScreen } from "./auth/auth-screen";

export function AdminAuthGate({ children }: { children: (user: AuthenticatedUser, branding: AppBranding) => ReactNode }) {
  const queryClient = useQueryClient();
  const setup = useQuery(authQueries.setupStatus());
  const session = useQuery(authQueries.session(setup.data?.initialized === true));
  const pageTitle =
    setup.isLoading || (setup.data?.initialized && session.isLoading)
      ? "RescueBase wird geladen"
      : setup.isError || session.isError
        ? "Fehler"
        : setup.data && !setup.data.initialized
          ? "Erstadmin einrichten"
          : !session.data?.user
            ? "Anmelden"
            : undefined;

  useDocumentTitle(pageTitle);

  if (setup.isLoading || (setup.data?.initialized && session.isLoading)) return <LoadingPanel label="RescueBase wird geladen" />;
  if (setup.isError) return <ErrorPanel error={toError(setup.error)} onRetry={() => void setup.refetch()} />;
  if (setup.data && !setup.data.initialized) return <AuthScreen branding={setup.data}><SetupForm onDone={() => void Promise.all([queryClient.invalidateQueries({ queryKey: authKeys.setupStatus() }), queryClient.invalidateQueries({ queryKey: authKeys.session() })])} /></AuthScreen>;
  if (session.isError || !session.data?.user) return <AuthScreen branding={setup.data} showThemeToggle={false}><LoginForm onDone={() => void queryClient.invalidateQueries({ queryKey: authKeys.session() })} /></AuthScreen>;
  return children(session.data.user, {
    appName: session.data.appName ?? setup.data?.appName ?? "RescueBase",
    appSubtitle: session.data.appSubtitle ?? setup.data?.appSubtitle ?? "Sanitätslager",
    showLogo: session.data.showLogo ?? setup.data?.showLogo ?? true,
    showAppName: session.data.showAppName ?? setup.data?.showAppName ?? false,
    showAppSubtitle: session.data.showAppSubtitle ?? setup.data?.showAppSubtitle ?? true
  });
}
