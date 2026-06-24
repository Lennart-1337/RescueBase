import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { NotificationTemplate, NotificationTemplateKey } from "../../lib/admin-settings-types";

const labels: Record<NotificationTemplateKey, string> = {
  ALERT_IMMEDIATE: "Sofortwarnung",
  ALERT_DIGEST: "Tägliche Übersicht",
  NEW_ORDER: "Neuer Nachfüllauftrag"
};

export function TemplateSettingsPanel({ templates }: { templates: NotificationTemplate[] }) {
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? "ALERT_DIGEST");
  const selected = templates.find((template) => template.key === selectedKey) ?? templates[0];
  return selected ? <TemplateEditor key={selected.key} template={selected} onSelect={setSelectedKey} templates={templates} /> : null;
}

function TemplateEditor(props: { template: NotificationTemplate; templates: NotificationTemplate[]; onSelect: (key: NotificationTemplateKey) => void }) {
  const [draft, setDraft] = useState(props.template);
  const queryClient = useQueryClient();
  const preview = useMutation({ mutationFn: () => rescueBaseApi.previewNotificationTemplate(draft.key, templateBody(draft)) });
  const save = useMutation({
    mutationFn: () => rescueBaseApi.updateNotificationTemplate(draft.key, templateBody(draft)),
    onSuccess: async (template) => {
      setDraft(template);
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    }
  });
  return (
    <Panel aria-label="E-Mail-Vorlagen" className="template-settings-panel">
      <div className="panel-header">
        <div><h2>E-Mail-Vorlagen</h2></div>
        <div className="topbar-actions">
          <Button disabled={preview.isPending} onClick={() => preview.mutate()} type="button" variant="secondary"><Eye data-icon="inline-start" />Vorschau</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()} type="button">Vorlage speichern</Button>
        </div>
      </div>
      <div className="form-grid form-grid-two template-settings-grid">
        <div className="template-settings-fields">
          <Field label="Vorlage"><select onChange={(event) => props.onSelect(event.target.value as NotificationTemplateKey)} value={draft.key}>{props.templates.map((template) => <option key={template.key} value={template.key}>{labels[template.key]}</option>)}</select></Field>
          <Field label="Betreff"><input onChange={(event) => setDraft({ ...draft, subjectTemplate: event.target.value })} value={draft.subjectTemplate} /></Field>
          <Field label="Einleitung"><textarea onChange={(event) => setDraft({ ...draft, introTemplate: event.target.value })} rows={3} value={draft.introTemplate} /></Field>
          <Field label="Inhalt"><textarea onChange={(event) => setDraft({ ...draft, bodyTemplate: event.target.value })} rows={5} value={draft.bodyTemplate} /></Field>
          <p className="field-help">Verfügbare Platzhalter: {draft.allowedPlaceholders.map((placeholder) => `{{${placeholder}}}`).join(", ") || "keine"}</p>
        </div>
        <div className="template-preview" aria-live="polite">
          <span>Vorschau</span>
          {preview.data ? <><strong>{preview.data.subject}</strong><pre>{preview.data.text}</pre></> : null}
        </div>
      </div>
      {preview.error || save.error ? <InlineError error={(preview.error ?? save.error) as Error} /> : null}
    </Panel>
  );
}

function templateBody(template: NotificationTemplate) {
  return { subjectTemplate: template.subjectTemplate, introTemplate: template.introTemplate, bodyTemplate: template.bodyTemplate };
}
