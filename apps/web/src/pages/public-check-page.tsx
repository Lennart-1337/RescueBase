import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useDocumentTitle } from "../app/document-title";
import { toError } from "../app/formatters";
import { ErrorPanel } from "../components/state-panels";
import { StatusBadge } from "../components/status-badge";
import { Panel } from "../components/ui";
import { ThemeToggle } from "../app/theme";
import { rescueBaseApi } from "../lib/api";
import type { CompleteCheckResponse } from "../lib/types";
import { publicQueries } from "../queries/public";
import { PublicCheckForm } from "./public-check/public-check-form";
import "./public-check/public-check-page.css";

export function PublicCheck({ token }: { token: string }) {
  const query = useQuery(publicQueries.publicKit(token));
  const mutation = useMutation({ mutationFn: (body: Parameters<typeof rescueBaseApi.completeCheck>[1]) => rescueBaseApi.completeCheck(token, body) });
  useDocumentTitle(query.data?.kit.name);

  if (query.isError) {
    return (
      <main className="mobile-check">
        <header className="mobile-check-toolbar">
          <ThemeToggle className="public-theme-toggle" />
        </header>
        <ErrorPanel error={toError(query.error)} onRetry={() => void query.refetch()} />
      </main>
    );
  }
  if (query.isLoading || !query.data) {
    return (
      <div className="mobile-check loading">
        <header className="mobile-check-toolbar">
          <ThemeToggle className="public-theme-toggle" />
        </header>
        <p className="mobile-check-status">Rucksack wird geladen...</p>
      </div>
    );
  }
  if (mutation.data) {
    return <PublicCheckSuccess result={mutation.data} />;
  }

  return <PublicCheckForm isSubmitting={mutation.isPending} onSubmit={mutation.mutate} publicKit={query.data} submitError={mutation.error ? toError(mutation.error) : null} />;
}

function PublicCheckSuccess({ result }: { result: CompleteCheckResponse }) {
  return (
    <main className="mobile-check">
      <header className="mobile-check-toolbar">
        <ThemeToggle className="public-theme-toggle" />
      </header>
      <Panel className="success-panel">
        <CheckCircle2 />
        <h1>Check abgeschlossen</h1>
        <p>Protokoll {result.check.id} wurde gespeichert.</p>
        <StatusBadge kind="kit" status={result.check.effectiveStatus} />
        <p>{result.replenishmentOrder ? `Nachfüllauftrag ${result.replenishmentOrder.id} wurde erzeugt.` : "Es wurde kein Nachfüllauftrag benötigt."}</p>
      </Panel>
    </main>
  );
}
