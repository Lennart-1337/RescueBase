import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui";
import type { Device } from "./types";

export function releaseBlockers(device: Device): string[] {
  const missing = [
    !device.mpgModelId && "Modell fehlt.",
    !device.mpgModel?.instructionsDocumentId && "Gebrauchsanweisung des Modells fehlt.",
    !device.mpgModel?.requirementsReviewedAt && "Modellanforderungen sind noch nicht geprüft.",
    !device.inventoryNumber && "Inventarnummer fehlt.",
    !(device.serialNumber || device.lotCode) && "Seriennummer oder Loscode fehlt.",
    !device.acquisitionYear && "Anschaffungsjahr fehlt.",
    !device.commissionedAt && "Inbetriebnahme fehlt."
  ].filter((value): value is string => typeof value === "string");
  const evidence = (device.reasons ?? []).map(reason => typeof reason === "string" ? reason : reason.message ?? reason.reason ?? reason.code ?? "Sperrgrund vorhanden.")
    .filter(reason => reason !== "Dokumentierte Freigabe fehlt." && reason !== "Prüfanforderungen sind noch nicht geprüft.");
  return [...new Set([...missing, ...evidence])];
}

export function ReleaseReadiness({ device, onRelease }: { device: Device; onRelease: () => Promise<unknown> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const blockers = releaseBlockers(device);
  async function finish() {
    setPending(true); setError("");
    try { await onRelease(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Die Freigabe konnte nicht dokumentiert werden."); }
    finally { setPending(false); }
  }
  return <section aria-label="Freigabe vorbereiten" className="mpg-release-readiness">
    <header><div><h3>Freigabe vorbereiten</h3><p>Modellprüfung und Gerätefreigabe bleiben getrennt dokumentiert. Nach Behebung aller Punkte kann dieses Gerät freigegeben werden.</p></div></header>
    {blockers.length ? <><strong>Vor der Freigabe zu erledigen</strong><ul>{blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></>
      : <p>Alle dokumentierten Voraussetzungen sind erfüllt. Die Freigabe gilt nur für dieses Gerät.</p>}
    {error ? <p className="mpg-error" role="alert">{error}</p> : null}
    <Button disabled={blockers.length > 0} loading={pending} onClick={() => void finish()} type="button"><CheckCircle2 data-icon="inline-start" />Gerät freigeben</Button>
  </section>;
}
