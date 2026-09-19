import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui";
import { useMpgAction } from "./api";
import { MpgFormDialog } from "./form-dialog";
import { dateField, textField } from "./shared";
import type { Device } from "./types";

const kinds = ["STK", "MTK", "MAINTENANCE", "OTHER"].map(value => ({ value, label: ({ MAINTENANCE: "Wartung", OTHER: "Weitere Kontrolle" } as Record<string, string>)[value] ?? value }));

export function DeviceRequirements({ device }: { device: Device }) {
  const [open, setOpen] = useState(false);
  const action = useMpgAction();
  const own = (device.requirements ?? []).filter(requirement => requirement.deviceId === device.id);
  const fields = [{ name: "kind", label: "Prüfart", required: true, options: kinds }, textField("title", "Bezeichnung"), { ...textField("justification", "Begründung für die strengere Anforderung"), type: "textarea" as const }, textField("source", "Quelle / Beleg"), { name: "intervalMonths", label: "Intervall in Monaten", type: "number" as const, min: 1 }, dateField("firstDueAt", "Erste Fälligkeit")];
  return <section className="mpg-subsection"><header className="mpg-section-header"><div><h3>Zusätzliche Prüfanforderungen</h3><p>Gerätespezifische Anforderungen dürfen die Modellvorgaben nur verschärfen.</p></div><Button onClick={() => setOpen(true)} type="button" variant="secondary"><Plus data-icon="inline-start" />Anforderung ergänzen</Button></header>
    {own.length ? <div className="mpg-requirement-list">{own.map(requirement => <div key={requirement.id}><strong>{requirement.kind} · {requirement.title}</strong><span>{requirement.source} · {requirement.justification}</span></div>)}</div> : <p>Keine zusätzlichen Anforderungen dokumentiert.</p>}
    <MpgFormDialog fields={fields} intent="create" onClose={() => setOpen(false)} onSubmit={body => action.mutateAsync({ path: `/devices/${device.id}/requirements`, body })} open={open} size="wide" submitLabel="Anforderung ergänzen" title="Strengere Prüfanforderung ergänzen" />
  </section>;
}
