import type { BadgeTone } from "../../components/badge";
import type { CheckProtocolSummary } from "../../lib/types";

export function protocolStatusTone(
  status: CheckProtocolSummary["effectiveStatus"],
): BadgeTone {
  if (status === "READY") return "ready";
  if (status === "CONDITIONAL") return "warning";
  return "danger";
}
