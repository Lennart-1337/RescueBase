import { useMpgAction } from "./api";
import { MpgForm } from "./form";
import { textField, dateField } from "./shared";
import { Documents } from "./documents";
import type { Model } from "./types";
export function Models({ models }: { models: Model[] }) {
  const action = useMpgAction();
  return <section><h2>Modelle und Prüfanforderungen</h2><details className="mpg-detail"><summary>Modell anlegen</summary><MpgForm title="Neues Modell" fields={[textField("name", "Modellbezeichnung"), textField("manufacturer", "Hersteller"), textField("manufacturerAddress", "Herstelleranschrift"), textField("productType", "Produktart")]} onSubmit={(body) => action.mutateAsync({ path: "/models", body })} /></details>
    {models.map((model) => <details key={model.id} className="mpg-detail"><summary>{model.manufacturer} · {model.name} — {model.requirementsReviewedAt ? "Anforderungen geprüft" : "Prüfung offen"}</summary>
      <p>{model.productType} · {model.manufacturerAddress}</p><ul>{model.requirements.map((requirement) => <li key={requirement.id}>{requirement.kind}: {requirement.title} · {requirement.mandatory ? "Pflicht" : "Optional"} · {requirement.source}</li>)}</ul>
      <MpgForm title="Prüfanforderung ergänzen" initial={{ mandatory: true }} fields={[{ name: "kind", label: "Prüfart", required: true, options: ["STK", "MTK", "MAINTENANCE", "OTHER"].map((value) => ({ value, label: ({ MAINTENANCE: "Wartung", OTHER: "Weitere Kontrolle" } as Record<string, string>)[value] ?? value })) }, textField("title", "Bezeichnung"), textField("source", "Beleg / Herstellerangabe"), { name: "mandatory", label: "Pflichtprüfung", type: "checkbox" }, { name: "intervalMonths", label: "Intervall in Monaten", type: "number", min: 1 }, dateField("firstDueAt", "Erste Fälligkeit")]} onSubmit={(body) => action.mutateAsync({ path: `/models/${model.id}/requirements`, body })} />
      <Documents owner={{ modelId: model.id }} onUploaded={(id) => action.mutateAsync({ path: `/models/${model.id}`, method: "PATCH", body: { version: model.version, instructionsDocumentId: id } })} />
      <p>Ein hier hochgeladenes Dokument wird als aktuelle Gebrauchsanweisung des Modells verknüpft. Frühere Versionen bleiben erhalten.</p>
      <MpgForm title="Anforderungen verbindlich prüfen" fields={[textField("source", "Prüfgrundlage und Begründung (auch bei keiner Prüfpflicht)")]} submitLabel="Modellprüfung dokumentieren" onSubmit={(body) => action.mutateAsync({ path: `/models/${model.id}/review`, body: { ...body, version: model.version } })} />
    </details>)}</section>;
}
