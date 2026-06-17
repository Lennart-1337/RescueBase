import { History, Plus, Trash2 } from "lucide-react";
import { daysUntil, formatDate } from "../../app/formatters";
import { ListFilterBar } from "../../components/list-filter-bar";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Field, Panel } from "../../components/ui";
import type { Article, Batch, Location } from "../../lib/types";

type InventoryFilters = {
  articleId: string;
  locationId: string;
  q: string;
  showEmpty: boolean;
};

export function BatchListPanel(props: {
  articles: Article[];
  batches: Batch[];
  error: Error | null;
  filters: InventoryFilters;
  isSubmitting: boolean;
  locations: Location[];
  onCreate: () => void;
  onDelete: (id: string) => void;
  onFilterChange: (patch: Partial<InventoryFilters>) => void;
  onResetFilters: () => void;
  onSelect: (id: string) => void;
  selectedBatchId: string | null;
  totalCount: number;
}) {

  function confirmDelete(batch: Batch) {
    if (window.confirm(`Charge "${batch.lotNumber}" wirklich löschen?`)) {
      props.onDelete(batch.id);
    }
  }

  return (
    <Panel>
      <div className="panel-header"><div><h2>Bestandschargen</h2><p>Filtern Sie Bestand nach Suchbegriff, Artikel und Lagerort.</p></div><Button onClick={props.onCreate} type="button"><Plus data-icon="inline-start" />Charge hinzufügen</Button></div>
      <ListFilterBar countLabel={`${props.batches.length}/${props.totalCount} sichtbar`} onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Artikel oder Charge" value={props.filters.q} /></Field>
        <Field label="Standort"><select onChange={(event) => props.onFilterChange({ locationId: event.target.value })} value={props.filters.locationId}><option value="">Alle Standorte</option>{props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        <Field label="Artikel"><select onChange={(event) => props.onFilterChange({ articleId: event.target.value })} value={props.filters.articleId}><option value="">Alle Artikel</option>{props.articles.map((article) => <option key={article.id} value={article.id}>{article.name}</option>)}</select></Field>
        <label className="check-field"><input checked={props.filters.showEmpty} onChange={(event) => props.onFilterChange({ showEmpty: event.target.checked })} type="checkbox" /><span>Chargen mit Menge 0 anzeigen</span></label>
      </ListFilterBar>
      <div className="table">
        {props.batches.map((batch) => (
          <div className="table-row" key={batch.id}>
            <span><strong>{batch.article.name}</strong><small>{batch.lotNumber} · {batch.location.name}</small></span>
            <span>{batch.quantity} {batch.article.unit}</span>
            <div className="row-actions"><Badge tone={daysUntil(batch.expiresAt) <= 90 ? "danger" : "neutral"}>{formatDate(batch.expiresAt)}</Badge><Button onClick={() => props.onSelect(batch.id)} type="button" variant={props.selectedBatchId === batch.id ? "secondary" : "ghost"}><History data-icon="inline-start" />Korrigieren</Button><Button aria-label={`Charge ${batch.lotNumber} löschen`} disabled={props.isSubmitting} onClick={() => confirmDelete(batch)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button></div>
          </div>
        ))}
      </div>
      {props.batches.length === 0 ? <div className="compact-list-empty">Aktuell sind keine sichtbaren Chargen vorhanden.</div> : null}
      {props.error ? <InlineError error={props.error} /> : null}
    </Panel>
  );
}
