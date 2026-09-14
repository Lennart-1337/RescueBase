import type { ReactNode } from "react";
import { ErrorPanel, LoadingPanel } from "../../components/state-panels";
import type { UseQueryResult } from "@tanstack/react-query";
import type { FormField } from "./form";
export const textField = (name: string, label: string, required = true): FormField => ({ name, label, required });
export const dateField = (name: string, label: string, required = false): FormField => ({ name, label, type: "date", required });
export function QueryState({ query }: { query: Pick<UseQueryResult, "isPending" | "error" | "refetch"> }) {
  return query.isPending ? <LoadingPanel label="MPG-Daten werden geladen" /> : query.error ? <ErrorPanel error={query.error} onRetry={() => void query.refetch()} /> : null;
}
export function MpgTable({ headings, children, empty }: { headings: string[]; children: ReactNode; empty?: boolean }) {
  return <div className="mpg-table-scroll"><table className="mpg-table"><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty ? <p>Es sind noch keine Einträge vorhanden.</p> : null}</div>;
}
