import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { statusLabels, toError } from "../app/formatters";
import { ErrorPanel } from "../components/state-panels";
import { Badge, Panel } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { CompleteCheckResponse } from "../lib/types";
import { PublicCheckForm } from "./public-check/public-check-form";

export function PublicCheck({ token }: { token: string }) {
  const query = useQuery({ queryKey: ["public-kit", token], queryFn: () => rescueBaseApi.publicKit(token) });
  const mutation = useMutation({ mutationFn: (body: Parameters<typeof rescueBaseApi.completeCheck>[1]) => rescueBaseApi.completeCheck(token, body) });

  if (query.isError) {
    return <main className="mobile-check"><ErrorPanel error={toError(query.error)} onRetry={() => void query.refetch()} /></main>;
  }
  if (query.isLoading || !query.data) {
    return <div className="mobile-check loading">Rucksack wird geladen...</div>;
  }
  if (mutation.data) {
    return <PublicCheckSuccess result={mutation.data} />;
  }

  return <PublicCheckForm onSubmit={mutation.mutate} publicKit={query.data} submitError={mutation.error ? toError(mutation.error) : null} />;
}

function PublicCheckSuccess({ result }: { result: CompleteCheckResponse }) {
  return (
    <main className="mobile-check">
      <Panel className="success-panel">
        <CheckCircle2 />
        <h1>Check abgeschlossen</h1>
        <p>Protokoll {result.check.id} wurde gespeichert.</p>
        <Badge tone={result.check.effectiveStatus === "READY" ? "ready" : result.check.effectiveStatus === "CONDITIONAL" ? "warning" : "danger"}>{statusLabels[result.check.effectiveStatus]}</Badge>
        <p>{result.replenishmentOrder ? `Nachfüllauftrag ${result.replenishmentOrder.id} wurde erzeugt.` : "Es wurde kein Nachfüllauftrag benötigt."}</p>
      </Panel>
    </main>
  );
}
