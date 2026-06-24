import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { toError } from "./formatters";
import { AuthScreen } from "./auth/auth-screen";
import { LoginForm } from "./auth/login-form";
import { SetupForm } from "./auth/setup-form";

export { AuthScreen } from "./auth/auth-screen";

export function AdminAuthGate({ children }: { children: (user: AuthenticatedUser) => ReactNode }) {
  const queryClient = useQueryClient();
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: rescueBaseApi.setupStatus });
  const session = useQuery({ queryKey: ["session"], queryFn: rescueBaseApi.session, enabled: setup.data?.initialized === true });

  if (setup.isLoading || (setup.data?.initialized && session.isLoading)) return <LoadingPanel label="RescueBase wird geladen" />;
  if (setup.isError) return <ErrorPanel error={toError(setup.error)} onRetry={() => void setup.refetch()} />;
  if (setup.data && !setup.data.initialized) return <AuthScreen><SetupForm onDone={() => void Promise.all([queryClient.invalidateQueries({ queryKey: ["setup-status"] }), queryClient.invalidateQueries({ queryKey: ["session"] })])} /></AuthScreen>;
  if (session.isError || !session.data?.user) return <AuthScreen><LoginForm onDone={() => void queryClient.invalidateQueries({ queryKey: ["session"] })} /></AuthScreen>;
  return children(session.data.user);
}
