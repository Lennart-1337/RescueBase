import { useEffect, useState } from "react";
import { Pencil, Plus, Save, X } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Dialog, Field, Panel } from "../../components/ui";
import type { Article, CreateTemplateRequest, KitTemplate, ReviseTemplateRequest } from "../../lib/types";

type PositionDraft = { articleId: string; critical: boolean; moduleName: string; requiredQuantity: number };

export function TemplatePanel(props: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: CreateTemplateRequest) => Promise<unknown>;
  onRevise: (id: string, body: ReviseTemplateRequest) => Promise<unknown>;
  templates: KitTemplate[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionDraft[]>([{ articleId: props.articles[0]?.id ?? "", critical: false, moduleName: "", requiredQuantity: 1 }]);
  const normalizedPositions = positions.map((position) => ({ ...position, articleId: position.articleId || props.articles[0]?.id || "", moduleName: position.moduleName.trim() || undefined }));
  const canSubmit = Boolean(name.trim() && props.articles.length > 0 && normalizedPositions.every((position) => position.articleId && position.requiredQuantity > 0));

  useEffect(() => {
    const firstArticleId = props.articles[0]?.id;
    if (firstArticleId && positions.some((position) => !position.articleId)) {
      setPositions((current) => current.map((position) => ({ ...position, articleId: position.articleId || firstArticleId })));
    }
  }, [positions, props.articles]);

  function resetForm() {
    setEditingTemplateId(null);
    setName("");
    setPositions([{ articleId: props.articles[0]?.id ?? "", critical: false, moduleName: "", requiredQuantity: 1 }]);
  }

  function openForCreate() {
    resetForm();
    setIsOpen(true);
  }

  function openForEdit(template: KitTemplate) {
    setEditingTemplateId(template.id);
    setName(template.name);
    setPositions(template.positions.map((position) => ({ articleId: position.articleId, critical: position.critical, moduleName: position.moduleName ?? "", requiredQuantity: position.requiredQuantity })));
    setIsOpen(true);
  }

  function updatePosition(index: number, patch: Partial<PositionDraft>) {
    setPositions((current) => current.map((position, currentIndex) => (currentIndex === index ? { ...position, ...patch } : position)));
  }

  async function submit() {
    if (!canSubmit) return;
    const action = editingTemplateId ? props.onRevise(editingTemplateId, { positions: normalizedPositions }) : props.onCreate({ name, positions: normalizedPositions });
    const succeeded = await action.then(() => true).catch(() => false);
    if (succeeded) {
      setIsOpen(false);
      resetForm();
    }
  }

  return (
    <Panel>
      <div className="panel-header">
        <div>
          <h2>Rucksackvorlagen</h2>
          <p>Versionierte Soll-Listen mit Artikeln, Modulen und kritischen Positionen.</p>
        </div>
        <Button disabled={props.articles.length === 0} onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Vorlage hinzufügen</Button>
      </div>
      {props.articles.length === 0 ? <div className="compact-list-empty">Vorlagen benötigen zuerst mindestens einen Artikel.</div> : null}
      {props.templates.length === 0 ? <div className="compact-list-empty">Noch keine Vorlagen angelegt.</div> : null}
      <div className="compact-list">
        {props.templates.map((template) => (
          <div className="compact-list-row compact-list-row-actions" key={template.id}>
            <span><strong>{template.name} v{template.version}</strong><small>{template.positions.length} Positionen</small></span>
            <div className="row-actions">
              {template.positions.some((position) => position.critical) ? <Badge tone="info">enthält kritisch</Badge> : null}
              <Button onClick={() => openForEdit(template)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog actions={<><Button disabled={props.isSubmitting} onClick={() => setIsOpen(false)} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit || props.isSubmitting} onClick={() => void submit()} type="button">{editingTemplateId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{editingTemplateId ? "Neue Version speichern" : "Vorlage speichern"}</Button></>} description={editingTemplateId ? "Bestehende Vorlagen bleiben historisch erhalten. Änderungen werden als neue Version gespeichert." : "Definieren Sie Sollmengen, optionale Module und kritische Positionen für neue Rucksäcke."} onClose={() => setIsOpen(false)} open={isOpen} title={editingTemplateId ? "Rucksackvorlage bearbeiten" : "Rucksackvorlage anlegen"}>
        <div className="template-form">
          <Field label="Vorlagenname"><input disabled={Boolean(editingTemplateId)} onChange={(event) => setName(event.target.value)} value={name} /></Field>
          <div className="template-position-list">
            {positions.map((position, index) => (
              <div className="template-position-row" key={index}>
                <Field label="Artikel"><select disabled={props.articles.length === 0} onChange={(event) => updatePosition(index, { articleId: event.target.value })} value={position.articleId || props.articles[0]?.id || ""}>{props.articles.map((article) => <option key={article.id} value={article.id}>{article.name}</option>)}</select></Field>
                <Field label="Modul"><input onChange={(event) => updatePosition(index, { moduleName: event.target.value })} value={position.moduleName} /></Field>
                <Field label="Sollmenge"><input min="1" onChange={(event) => updatePosition(index, { requiredQuantity: Number(event.target.value) })} type="number" value={position.requiredQuantity} /></Field>
                <label className="check-field template-critical"><input checked={position.critical} onChange={(event) => updatePosition(index, { critical: event.target.checked })} type="checkbox" /><span>Kritisch</span></label>
                <Button disabled={positions.length === 1} onClick={() => setPositions((current) => current.filter((_, currentIndex) => currentIndex !== index))} type="button" variant="ghost">Entfernen</Button>
              </div>
            ))}
          </div>
          <Button onClick={() => setPositions((current) => [...current, { articleId: props.articles[0]?.id ?? "", critical: false, moduleName: "", requiredQuantity: 1 }])} type="button" variant="secondary"><Plus data-icon="inline-start" />Position hinzufügen</Button>
        </div>
        {props.error ? <InlineError error={props.error} /> : null}
      </Dialog>
    </Panel>
  );
}
