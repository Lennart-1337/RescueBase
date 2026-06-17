import { Link } from "@tanstack/react-router";
import { ExternalLink, Pencil, Plus, QrCode, RotateCw, Trash2 } from "lucide-react";
import { statusLabels } from "../../app/formatters";
import { ListFilterBar } from "../../components/list-filter-bar";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { Kit, KitTemplate, Location } from "../../lib/types";

type KitFilters = {
  locationId: string;
  q: string;
  status: string;
  templateId: string;
};

export function KitListPanel(props: {
  actionError: Error | null;
  actionPending: boolean;
  filters: KitFilters;
  kits: Kit[];
  locations: Location[];
  onCreate: () => void;
  onDelete: (id: string) => void;
  onEdit: (kit: Kit) => void;
  onFilterChange: (patch: Partial<KitFilters>) => void;
  onResetFilters: () => void;
  onRotate: (id: string) => void;
  templates: KitTemplate[];
  totalCount: number;
}) {
  function confirmDelete(kit: Kit) {
    if (window.confirm(`Rucksack "${kit.name}" wirklich löschen?`)) {
      props.onDelete(kit.id);
    }
  }

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Rucksäcke</h2><p>Verwalten Sie physische Rucksäcke, QR-Dokumente und öffentliche Check-Zugänge.</p></div>
        <Button onClick={props.onCreate} type="button"><Plus data-icon="inline-start" />Rucksack hinzufügen</Button>
      </div>
      <ListFilterBar countLabel={`${props.kits.length}/${props.totalCount} sichtbar`} onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Name oder Kennung" value={props.filters.q} /></Field>
        <Field label="Standort"><SearchableSelect emptyLabel="Alle Standorte" onChange={(value) => props.onFilterChange({ locationId: value })} options={[{ label: "Alle Standorte", value: "" }, ...props.locations.map((location) => ({ label: location.name, value: location.id }))]} value={props.filters.locationId} /></Field>
        <Field label="Vorlage"><SearchableSelect emptyLabel="Alle Vorlagen" onChange={(value) => props.onFilterChange({ templateId: value })} options={[{ label: "Alle Vorlagen", value: "" }, ...props.templates.map((template) => ({ label: `${template.name} v${template.version}`, value: template.id, keywords: [template.name] }))]} value={props.filters.templateId} /></Field>
        <Field label="Status"><select onChange={(event) => props.onFilterChange({ status: event.target.value })} value={props.filters.status}><option value="">Alle Stati</option><option value="READY">Bereit</option><option value="CONDITIONAL">Bedingt einsatzbereit</option><option value="NOT_READY">Nicht einsatzbereit</option></select></Field>
      </ListFilterBar>
      <div className="table">
        {props.kits.map((kit) => (
          <div className="table-row kit-row" key={kit.id}>
            <span><strong>{kit.name}</strong><small>{kit.code} · {kit.location?.name}</small></span>
            <Badge tone={kit.status === "READY" ? "ready" : kit.status === "CONDITIONAL" ? "warning" : "danger"}>{statusLabels[kit.status]}</Badge>
            <div className="row-actions">
              <AnchorButton href={qrPdfUrl(kit.id, "a4", kit.tokenRotatedAt)} variant="secondary"><QrCode data-icon="inline-start" />A4-PDF</AnchorButton>
              <AnchorButton href={qrPdfUrl(kit.id, "label", kit.tokenRotatedAt)} variant="secondary"><QrCode data-icon="inline-start" />Etikett</AnchorButton>
              <Link className="button button-secondary" params={{ token: kit.publicToken }} to="/check/$token"><ExternalLink data-icon="inline-start" />Check öffnen</Link>
              <Button onClick={() => props.onEdit(kit)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button>
              <Button disabled={props.actionPending} onClick={() => props.onRotate(kit.id)} type="button" variant="ghost"><RotateCw data-icon="inline-start" />Rotieren</Button>
              <Button aria-label={`${kit.name} löschen`} disabled={props.actionPending} onClick={() => confirmDelete(kit)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button>
            </div>
          </div>
        ))}
      </div>
      {props.actionError ? <InlineError error={props.actionError} /> : null}
    </Panel>
  );
}

function qrPdfUrl(kitId: string, format: "a4" | "label", tokenRotatedAt: string) {
  const search = new URLSearchParams({ format, rev: tokenRotatedAt });
  return rescueBaseApi.reportUrl(`/reports/qr-label/${kitId}.pdf?${search.toString()}`);
}
