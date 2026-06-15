import { useState } from "react";
import { Pencil, Plus, Save, X } from "lucide-react";
import type { Article, CreateArticleRequest, UpdateArticleRequest } from "../../lib/types";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Dialog, Field, Panel } from "../../components/ui";

export function ArticlePanel(props: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: CreateArticleRequest) => Promise<unknown>;
  onSave: (id: string, body: UpdateArticleRequest) => Promise<unknown>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Stück");
  const [barcode, setBarcode] = useState("");
  const [criticalDefault, setCriticalDefault] = useState(false);
  const canSubmit = Boolean(name.trim() && unit.trim());

  function openForCreate() {
    setEditingId(null);
    setName("");
    setUnit("Stück");
    setBarcode("");
    setCriticalDefault(false);
    setIsOpen(true);
  }

  function openForEdit(article: Article) {
    setEditingId(article.id);
    setName(article.name);
    setUnit(article.unit);
    setBarcode(article.barcode ?? "");
    setCriticalDefault(article.criticalDefault);
    setIsOpen(true);
  }

  async function submit() {
    if (!canSubmit) return;
    const body = { name, unit, barcode: barcode.trim() || undefined, criticalDefault };
    const succeeded = await (editingId ? props.onSave(editingId, body) : props.onCreate(body)).then(() => true).catch(() => false);
    if (succeeded) {
      setIsOpen(false);
    }
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Artikel</h2>
          <p>Materialstamm mit Einheit, optionalem Barcode und Kritikalität.</p>
        </div>
        <Button onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Artikel hinzufügen</Button>
      </div>
      {props.articles.length === 0 ? <div className="compact-list-empty">Noch keine Artikel angelegt.</div> : null}
      <div className="compact-list">
        {props.articles.map((article) => (
          <div className="compact-list-row compact-list-row-actions" key={article.id}>
            <span><strong>{article.name}</strong><small>{article.unit}{article.barcode ? ` · ${article.barcode}` : ""}</small></span>
            <div className="row-actions">
              {article.criticalDefault ? <Badge tone="info">kritisch</Badge> : null}
              <Button onClick={() => openForEdit(article)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog actions={<><Button disabled={props.isSubmitting} onClick={() => setIsOpen(false)} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button">{editingId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{editingId ? "Artikel speichern" : "Artikel anlegen"}</Button></>} description="Pflegen Sie Materialstammdaten mit Einheit, optionalem Barcode und Standard-Kritikalität." onClose={() => setIsOpen(false)} open={isOpen} title={editingId ? "Artikel bearbeiten" : "Artikel anlegen"}>
        <div className="form-grid form-grid-two">
          <Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Einheit"><input value={unit} onChange={(event) => setUnit(event.target.value)} /></Field>
          <Field label="Barcode/DataMatrix"><input value={barcode} onChange={(event) => setBarcode(event.target.value)} /></Field>
          <label className="check-field"><input checked={criticalDefault} onChange={(event) => setCriticalDefault(event.target.checked)} type="checkbox" /><span>Kritisch als Standard</span></label>
        </div>
        {props.error ? <InlineError error={props.error} /> : null}
      </Dialog>
    </Panel>
  );
}
