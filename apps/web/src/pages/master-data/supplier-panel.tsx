import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "../../components/badge";
import { ListFilterBar } from "../../components/list-filter-bar";
import { ListRow, RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { PageToolbar } from "../../components/page-layout";
import { InlineError } from "../../components/state-panels";
import { toOptionalString } from "../../app/filter-utils";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import type { CreateSupplierRequest, UpdateSupplierRequest } from "../../lib/types";
import { SupplierForm, type SupplierFormValues } from "./supplier-form";
import type { SupplierSummary } from "./supplier-utils";
import { summarizeArticleNames } from "./supplier-utils";
import "./supplier-panel.css";

export function SupplierPanel(props: {
  error: Error | null;
  filters: { q: string };
  isSubmitting: boolean;
  onCreate: (body: CreateSupplierRequest) => Promise<unknown>;
  onDelete: (supplier: SupplierSummary) => void;
  onFilterChange: (patch: { q: string }) => void;
  onResetFilters: () => void;
  onSave: (id: string, body: UpdateSupplierRequest) => Promise<unknown>;
  suppliers: SupplierSummary[];
  totalCount: number;
}) {
  const [draft, setDraft] = useState(emptyDraft());
  const isOpen = draft.isOpen;
  const canSubmit = Boolean(draft.name.trim());

  function openForCreate() {
    setDraft({ ...emptyDraft(), isOpen: true });
  }

  function openForEdit(supplier: SupplierSummary) {
    setDraft({
      id: supplier.id,
      isOpen: true,
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      website: supplier.website ?? "",
      street: supplier.street ?? "",
      postalCode: supplier.postalCode ?? "",
      city: supplier.city ?? "",
      country: supplier.country ?? "",
      notes: supplier.notes ?? "",
    });
  }

  async function submit() {
    if (!canSubmit) return;
    const body = toSupplierRequest(draft);
    const succeeded = await (draft.id ? props.onSave(draft.id, body) : props.onCreate(body)).then(() => true).catch(() => false);
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
              actions={<RowActions><Badge tone="info">{supplier.articleCount} Artikel</Badge><Button aria-label={`${supplier.name} bearbeiten`} disabled={props.isSubmitting} onClick={() => openForEdit(supplier)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button><Button aria-label={`${supplier.name} löschen`} disabled={props.isSubmitting} onClick={() => props.onDelete(supplier)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Löschen</Button></RowActions>}
              key={supplier.id}
            >
              <span className="supplier-row-main">
                <strong>{supplier.name}</strong>
                <small>{summarizeArticleNames(supplier.articleNames)}</small>
              </span>
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
          <SupplierForm autoFocus onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} value={draft} />
          {props.error ? <InlineError error={props.error} /> : null}
        </Dialog>
      </Panel>
    </>
  );
}

function emptyDraft(): SupplierDraft {
  return {
    id: "",
    isOpen: false,
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    website: "",
    street: "",
    postalCode: "",
    city: "",
    country: "",
    notes: "",
  };
}

type SupplierDraft = SupplierFormValues & {
  id: string;
  isOpen: boolean;
};

function toSupplierRequest(draft: SupplierFormValues): CreateSupplierRequest {
  return {
    name: draft.name.trim(),
    contactPerson: toOptionalString(draft.contactPerson),
    email: toOptionalString(draft.email),
    phone: toOptionalString(draft.phone),
    website: toOptionalString(draft.website),
    street: toOptionalString(draft.street),
    postalCode: toOptionalString(draft.postalCode),
    city: toOptionalString(draft.city),
    country: toOptionalString(draft.country),
    notes: toOptionalString(draft.notes),
  };
}
