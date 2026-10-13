import { useEffect, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { PanelHeader } from "../../components/panel-header";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field, Panel } from "../../components/ui";
import type { Article, CreateTemplateRequest, KitTemplate, ReviseTemplateRequest } from "../../lib/types";
import { TemplatePositionRow } from "./template-position-row";
import { moveItem, type ReorderDirection } from "./reorder";
import { TemplateListRow } from "./template-list-row";
import "./template-panel.css";

type PositionDraft = { articleId: string; critical: boolean; draftId: string; moduleName: string; requiredQuantity: number };
type TemplateDraft = { name: string; positions: PositionDraft[] };
let nextDraftId = 0;

export function TemplatePanel(props: {
  articles: Article[];
  error: Error | null;
  isSubmitting: boolean;
  onCreate: (body: CreateTemplateRequest) => Promise<unknown>;
  onDelete: (id: string) => void;
  onRevise: (id: string, body: ReviseTemplateRequest) => Promise<unknown>;
  templates: KitTemplate[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionDraft[]>([createPositionDraft(props.articles[0]?.id ?? "")]);
  const [initialDraft, setInitialDraft] = useState<TemplateDraft>({ name: "", positions: [createPositionDraft(props.articles[0]?.id ?? "")] });
  const normalizedPositions = positions.map((position) => ({
    articleId: position.articleId || props.articles[0]?.id || "",
    critical: position.critical,
    moduleName: position.moduleName.trim() || undefined,
    requiredQuantity: position.requiredQuantity
  }));
  const canSubmit = Boolean(name.trim() && props.articles.length > 0 && normalizedPositions.every((position) => position.articleId && position.requiredQuantity > 0));
  const isDirty = serializeDraft({ name, positions }) !== serializeDraft(initialDraft);

  useEffect(() => {
    const firstArticleId = props.articles[0]?.id;
    if (firstArticleId && positions.some((position) => !position.articleId)) {
      setPositions((current) => current.map((position) => ({ ...position, articleId: position.articleId || firstArticleId })));
    }
  }, [positions, props.articles]);

  function resetForm() {
    setIsCloseConfirmOpen(false);
    setEditingTemplateId(null);
    setName("");
    const emptyDraft = createEmptyDraft(props.articles[0]?.id ?? "");
    setPositions(emptyDraft.positions);
    setInitialDraft(emptyDraft);
  }

  function openForCreate() {
    resetForm();
    setIsOpen(true);
  }

  function openForEdit(template: KitTemplate) {
    const draft = createDraftFromTemplate(template);
    setEditingTemplateId(template.id);
    setName(draft.name);
    setPositions(draft.positions);
    setInitialDraft(draft);
    setIsOpen(true);
  }

  function openForDuplicate(template: KitTemplate) {
    const draft = { ...createDraftFromTemplate(template), name: `${template.name} Kopie` };
    setIsCloseConfirmOpen(false);
    setEditingTemplateId(null);
    setName(draft.name);
    setPositions(draft.positions);
    setInitialDraft(draft);
    setIsOpen(true);
  }

  function updatePosition(index: number, patch: Partial<PositionDraft>) {
    setPositions((current) => current.map((position, currentIndex) => (currentIndex === index ? { ...position, ...patch } : position)));
  }

  function movePosition(index: number, direction: ReorderDirection) {
    const targetIndex = direction === "start" ? 0 : direction === "end" ? positions.length - 1 : direction === "up" ? Math.max(0, index - 1) : Math.min(positions.length - 1, index + 1);
    setPositions((current) => moveItem(current, index, targetIndex));
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

  function confirmDelete(template: KitTemplate) {
    if (window.confirm(`Rucksackvorlage "${template.name} v${template.version}" wirklich löschen?`)) {
      props.onDelete(template.id);
    }
  }

  function closeImmediately() {
    setIsOpen(false);
    resetForm();
  }

  function requestClose() {
    if (!isDirty) {
      closeImmediately();
      return;
    }
    setIsCloseConfirmOpen(true);
  }

  return (
    <Panel>
      <PanelHeader title="Rucksackvorlagen" actions={<Button disabled={props.articles.length === 0} onClick={openForCreate} type="button"><Plus data-icon="inline-start" />Vorlage hinzufügen</Button>} />
      {props.articles.length === 0 ? <div className="compact-list-empty">Vorlagen benötigen zuerst mindestens einen Artikel.</div> : null}
      {props.templates.length === 0 ? <div className="compact-list-empty">Noch keine Vorlagen angelegt.</div> : null}
      <div className="table">
        {props.templates.map((template) => (
          <TemplateListRow
            isSubmitting={props.isSubmitting}
            key={template.id}
            onDelete={() => confirmDelete(template)}
            onDuplicate={() => openForDuplicate(template)}
            onEdit={() => openForEdit(template)}
            template={template}
          />
        ))}
      </div>
      <Dialog className="template-editor-dialog" actions={<><Button disabled={props.isSubmitting} onClick={requestClose} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canSubmit} loading={props.isSubmitting} onClick={() => void submit()} type="button">{editingTemplateId ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{editingTemplateId ? "Neue Version speichern" : "Vorlage speichern"}</Button></>} onClose={requestClose} open={isOpen} title={editingTemplateId ? "Rucksackvorlage bearbeiten" : "Rucksackvorlage anlegen"}>
        <div className="template-form">
          <Field label="Vorlagenname"><input autoFocus={!editingTemplateId} disabled={Boolean(editingTemplateId)} onChange={(event) => setName(event.target.value)} value={name} /></Field>
          <div className="template-position-list">
            {positions.map((position, index) => (
              <TemplatePositionRow key={position.draftId} articles={props.articles} position={position} index={index} count={positions.length} isSubmitting={props.isSubmitting} autoFocus={Boolean(editingTemplateId) && index === 0} onUpdate={(patch) => updatePosition(index, patch)} onMove={(direction) => movePosition(index, direction)} onRemove={() => setPositions((current) => current.filter((_, currentIndex) => currentIndex !== index))} />
            ))}
          </div>
          <Button onClick={() => setPositions((current) => [...current, createPositionDraft(props.articles[0]?.id ?? "")])} type="button" variant="secondary"><Plus data-icon="inline-start" />Position hinzufügen</Button>
        </div>
        {props.error ? <InlineError error={props.error} /> : null}
      </Dialog>
      <Dialog
        actions={<><Button disabled={props.isSubmitting} onClick={() => setIsCloseConfirmOpen(false)} type="button" variant="ghost">Abbrechen</Button><Button disabled={props.isSubmitting} onClick={closeImmediately} type="button" variant="danger">Ohne Speichern schließen</Button><Button disabled={!canSubmit} loading={props.isSubmitting} onClick={() => void submit()} type="button"><Save data-icon="inline-start" />Änderungen speichern</Button></>}
        bodyClassName="confirm-dialog-body"
        onClose={() => setIsCloseConfirmOpen(false)}
        open={isCloseConfirmOpen}
        size="wide"
        title="Änderungen an Rucksackvorlage"
      >
        <p className="form-hint">Sie haben ungespeicherte Änderungen. Möchten Sie diese vor dem Schließen speichern?</p>
      </Dialog>
    </Panel>
  );
}

function createEmptyDraft(articleId: string): TemplateDraft {
  return { name: "", positions: [createPositionDraft(articleId)] };
}

function createDraftFromTemplate(template: KitTemplate): TemplateDraft {
  return {
    name: template.name,
    positions: template.positions.map((position) => ({
      articleId: position.articleId,
      critical: position.critical,
      draftId: position.id,
      moduleName: position.moduleName ?? "",
      requiredQuantity: position.requiredQuantity
    }))
  };
}

function serializeDraft(draft: TemplateDraft) {
  return JSON.stringify({
    name: draft.name.trim(),
    positions: draft.positions.map((position) => ({
      articleId: position.articleId,
      critical: position.critical,
      moduleName: position.moduleName.trim(),
      requiredQuantity: position.requiredQuantity
    }))
  });
}

function createPositionDraft(articleId: string): PositionDraft {
  nextDraftId += 1;
  return { articleId, critical: false, draftId: `position-draft-${nextDraftId}`, moduleName: "", requiredQuantity: 1 };
}
