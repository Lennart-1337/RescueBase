import type { UseQueryResult } from "@tanstack/react-query";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
export function QueryState({
  query,
}: {
  query: Pick<UseQueryResult, "error" | "isPending" | "refetch">;
}) {
  return query.error ? (
    <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  ) : query.isPending ? (
    <LoadingPanel label="Dienstdaten werden geladen" />
  ) : null;
}
