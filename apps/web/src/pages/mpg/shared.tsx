import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import type { UseQueryResult } from "@tanstack/react-query";
import type { FormField } from "./form";
import { statusLabel } from "./types";
export const textField = (name: string, label: string, required = true): FormField => ({ name, label, required });
export const dateField = (name: string, label: string, required = false): FormField => ({ name, label, type: "date", required });
export function QueryState({ query }: { query: Pick<UseQueryResult, "isPending" | "error" | "refetch"> }) {
  return query.isPending ? <LoadingPanel label="MPG-Daten werden geladen" /> : query.error ? <ErrorPanel error={query.error} onRetry={() => void query.refetch()} /> : null;
}
export function MpgStatus({ value }: { value: string }) {
  const tone = ["BLOCKED", "FAILED"].includes(value) ? "danger" : ["RELEASED", "PASSED", "FULL", "RESOLVED"].includes(value) ? "ready" : ["DRAFT", "IN_USE", "OPEN"].includes(value) ? "warning" : "neutral";
  return <span className={`mpg-status mpg-status-${tone}`}>{statusLabel(value)}</span>;
}
