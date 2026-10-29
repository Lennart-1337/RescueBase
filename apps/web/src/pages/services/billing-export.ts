import { ApiError } from "../../lib/openapi-client";
import type { Service } from "./types";
export type BillingKind = "OFFER" | "INVOICE";
export type BillingExport = { kind: BillingKind; number: string; issuedOn: string; recipient: string };
export async function exportBillingDocument(service: Service, input: BillingExport) {
  const response = await fetch(`/api/services/${service.id}/billing-documents`, {
    method: "POST", credentials: "include", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, version: service.version }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string | string[] };
    throw new ApiError(Array.isArray(error.message) ? error.message.join(" · ")
      : error.message ?? "Das PDF konnte nicht erstellt werden.", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${input.kind === "OFFER" ? "Angebot" : "Rechnung"}-${input.number.replace(/[^\p{L}\p{N}_.-]/gu, "-")}.pdf`;
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
