import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import type { AppBranding } from "./branding";
import { toError } from "./formatters";
import { AuthScreen } from "./auth/auth-screen";
import { LoginForm } from "./auth/login-form";
import { SetupForm } from "./auth/setup-form";

export { AuthScreen } from "./auth/auth-screen";

export function AdminAuthGate({ children }: { children: (user: AuthenticatedUser, branding: AppBranding) => ReactNode }) {
  const queryClient = useQueryClient();
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: rescueBaseApi.setupStatus, staleTime: 5 * 60 * 1000 });
  const session = useQuery({ queryKey: ["session"], queryFn: rescueBaseApi.session, enabled: setup.data?.initialized === true });

  if (setup.isLoading || (setup.data?.initialized && session.isLoading)) return <LoadingPanel label="RescueBase wird geladen" />;
  if (setup.isError) return <ErrorPanel error={toError(setup.error)} onRetry={() => void setup.refetch()} />;
  if (setup.data && !setup.data.initialized) return <AuthScreen branding={setup.data}><SetupForm onDone={() => void Promise.all([queryClient.invalidateQueries({ queryKey: ["setup-status"] }), queryClient.invalidateQueries({ queryKey: ["session"] })])} /></AuthScreen>;
  if (session.isError || !session.data?.user) return <AuthScreen branding={setup.data}><LoginForm onDone={() => void queryClient.invalidateQueries({ queryKey: ["session"] })} /></AuthScreen>;
  return children(session.data.user, {
    appName: session.data.appName ?? setup.data?.appName ?? "RescueBase",
    appSubtitle: session.data.appSubtitle ?? setup.data?.appSubtitle ?? "Sanitätslager",
    showLogo: session.data.showLogo ?? setup.data?.showLogo ?? true,
    showAppName: session.data.showAppName ?? setup.data?.showAppName ?? false,
    showAppSubtitle: session.data.showAppSubtitle ?? setup.data?.showAppSubtitle ?? true
  });
}
