import { useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Badge } from "../../components/badge";
import { ListFilterBar } from "../../components/list-filter-bar";
import { ListRow, RowActions } from "../../components/list-row";
import { PanelHeader } from "../../components/panel-header";
import { PageToolbar } from "../../components/page-layout";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import type { SupplierSummary } from "./supplier-utils";
import { summarizeArticleNames } from "./supplier-utils";

export function SupplierPanel(props: {
  error: Error | null;
  isSubmitting: boolean;
  onClear: (supplierName: string) => void;
  onFilterChange: (patch: { q: string }) => void;
  onRename: (supplierName: string, nextName: string) => Promise<unknown>;
  onResetFilters: () => void;
  suppliers: SupplierSummary[];
  totalCount: number;
  filters: { q: string };
}) {
  const [editingSupplierName, setEditingSupplierName] = useState("");
  const [draftName, setDraftName] = useState("");
  const isOpen = Boolean(editingSupplierName);
  const canSubmit = Boolean(draftName.trim() && draftName.trim() !== editingSupplierName);

  function openRenameDialog(supplierName: string) {
    setEditingSupplierName(supplierName);
    setDraftName(supplierName);
  }

  async function submit() {
    if (!canSubmit) return;
    const succeeded = await props.onRename(editingSupplierName, draftName).then(() => true).catch(() => false);
    if (succeeded) {
      setEditingSupplierName("");
      setDraftName("");
    }
  }

  function closeDialog() {
    setEditingSupplierName("");
    setDraftName("");
  }

  return (
    <>
      <PageToolbar label="Lieferanten filtern"><ListFilterBar countLabel={`${props.suppliers.length}/${props.totalCount} sichtbar`} fieldsClassName="form-grid-two" onReset={props.onResetFilters}>
        <Field label="Suche"><input onChange={(event) => props.onFilterChange({ q: event.target.value })} placeholder="Lieferant oder Artikel" value={props.filters.q} /></Field>
      </ListFilterBar></PageToolbar>
      <Panel>
        <PanelHeader description="Lieferanten werden aktuell aus den Standard-Lieferanten der Artikel abgeleitet." title="Lieferanten" />
        {props.suppliers.length === 0 ? <div className="compact-list-empty">Noch keine Lieferanten aus Artikeln abgeleitet.</div> : null}
        <div className="compact-list">
          {props.suppliers.map((supplier) => (
            <ListRow
              actions={<RowActions><Button aria-label={`${supplier.name} umbenennen`} disabled={props.isSubmitting} onClick={() => openRenameDialog(supplier.name)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Umbenennen</Button><Button aria-label={`${supplier.name} Zuweisung entfernen`} disabled={props.isSubmitting} onClick={() => props.onClear(supplier.name)} type="button" variant="danger"><Trash2 data-icon="inline-start" />Zuweisung entfernen</Button></RowActions>}
              key={supplier.name}
            >
              <span>
                <strong>{supplier.name}</strong>
                <small>{summarizeArticleNames(supplier.articleNames)}</small>
              </span>
              <Badge tone="info">{supplier.articleCount} Artikel</Badge>
            </ListRow>
          ))}
        </div>
        <Dialog
          actions={<><Button disabled={props.isSubmitting} onClick={closeDialog} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit} loading={props.isSubmitting} onClick={() => void submit()} type="button"><Save data-icon="inline-start" />Lieferant speichern</Button></>}
          onClose={closeDialog}
          open={isOpen}
          title="Lieferant umbenennen"
        >
          <Field label="Name"><input autoFocus onChange={(event) => setDraftName(event.target.value)} value={draftName} /></Field>
          {props.error ? <InlineError error={props.error} /> : null}
        </Dialog>
      </Panel>
    </>
  );
}
