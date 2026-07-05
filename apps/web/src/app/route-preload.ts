import type { QueryClient } from "@tanstack/react-query";
import type { LoginResponse, SetupStatus } from "../lib/types";
import { authKeys, authQueries } from "../queries/auth";

export async function preloadAdminQueries(
  queryClient: QueryClient,
  preload: () => Promise<unknown>,
) {
  await queryClient.prefetchQuery(authQueries.setupStatus());
  const setup = queryClient.getQueryData<SetupStatus>(authKeys.setupStatus());
  if (!setup?.initialized) return;

  await queryClient.prefetchQuery(authQueries.session());
  const session = queryClient.getQueryData<LoginResponse>(authKeys.session());
  if (!session?.user) return;

  await preload();
}
