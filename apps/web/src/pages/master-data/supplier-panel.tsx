import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "../../components/badge";
import { ListFilterBar } from "../../components/list-filter-bar";
import { ListRow, RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { PageToolbar } from "../../components/page-layout";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import type { SupplierSummary } from "./supplier-utils";
import { summarizeArticleNames } from "./supplier-utils";
import "./supplier-panel.css";

export function SupplierPanel(props: {
  error: Error | null;
  filters: { q: string };
  isSubmitting: boolean;
  onCreate: (name: string) => Promise<unknown>;
  onDelete: (supplier: SupplierSummary) => void;
  onFilterChange: (patch: { q: string }) => void;
  onResetFilters: () => void;
  onSave: (id: string, name: string) => Promise<unknown>;
  suppliers: SupplierSummary[];
  totalCount: number;
}) {
  const [draft, setDraft] = useState(emptyDraft());
  const isOpen = draft.isOpen;
  const canSubmit = Boolean(draft.name.trim());

  function openForCreate() {
    setDraft({ id: "", isOpen: true, name: "" });
  }

  function openForEdit(supplier: SupplierSummary) {
    setDraft({ id: supplier.id, isOpen: true, name: supplier.name });
  }

  async function submit() {
    if (!canSubmit) return;
    const succeeded = await (draft.id ? props.onSave(draft.id, draft.name) : props.onCreate(draft.name)).then(() => true).catch(() => false);
    if (succeeded) setDraft(emptyDraft());
  }

  return (
    <>
      <PageToolbar label="Lieferanten filtern"><ListFilterBar countLabel={`${props.suppliers.length}/${props.totalCount} sichtbar`} fieldsClassName="form-grid-two" onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Lieferant oder Artikel" value={props.filters.q} /></Field>
      </ListFilterBar></PageToolbar>
      <Panel>
        <PanelHeader actions={<Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Lieferant hinzufügen</Button>} description="Lieferanten werden zentral gepflegt und in Artikeln sowie Bestellungen referenziert." title="Lieferanten" />
        {props.suppliers.length === 0 ? <div className="compact-list-empty">Noch keine Lieferanten angelegt.</div> : null}
        <div className="compact-list">
          {props.suppliers.map((supplier) => (
            <ListRow
              actions={<RowActions><Button aria-label={`${supplier.name} bearbeiten`} disabled={props.isSubmitting} onClick={() => openForEdit(supplier)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button><Button aria-label={`${supplier.name} löschen`} disabled={props.isSubmitting} onClick={() => props.onDelete(supplier)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button></RowActions>}
              key={supplier.id}
            >
              <span className="supplier-row-main">
                <strong>{supplier.name}</strong>
                <small>{summarizeArticleNames(supplier.articleNames)}</small>
              </span>
              <Badge tone="info">{supplier.articleCount} Artikel</Badge>
            </ListRow>
          ))}
        </div>
        <Dialog
          actions={<><Button disabled={props.isSubmitting} onClick={() => setDraft(emptyDraft())} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit} loading={props.isSubmitting} onClick={() => void submit()} type="button"><Save data-icon="inline-start" />{draft.id ? "Lieferant speichern" : "Lieferant anlegen"}</Button></>}
          bodyClassName="dialog-form-body"
          onClose={() => setDraft(emptyDraft())}
          open={isOpen}
          title={draft.id ? "Lieferant bearbeiten" : "Lieferant anlegen"}
        >
          <Field label="Name"><input autoFocus onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} value={draft.name} /></Field>
          {props.error ? <InlineError error={props.error} /> : null}
        </Dialog>
      </Panel>
    </>
  );
}

function emptyDraft() {
  return { id: "", isOpen: false, name: "" };
}
