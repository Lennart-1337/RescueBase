import { useState } from "react";
import { Download } from "lucide-react";
import { AnchorButton, Button, Dialog, Field } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { KitTemplate } from "../../lib/types";

type ArticleNameMode = "short" | "full" | "both";

export function TemplatePdfExport({ template }: { template: KitTemplate }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ArticleNameMode>("short");
  const url = rescueBaseApi.reportUrl(`/reports/templates/${template.id}.pdf?articleNameMode=${mode}`);
  return <>
    <Button aria-label={`${template.name} v${template.version} als PDF exportieren`} className="mobile-icon-button" onClick={() => setOpen(true)} type="button" variant="ghost">
      <Download data-icon="inline-start" /><span className="button-label">PDF</span>
    </Button>
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="PDF exportieren"
      description={`${template.name} · Version ${template.version}`}
      actions={<>
        <Button onClick={() => setOpen(false)} type="button" variant="ghost">Abbrechen</Button>
        <AnchorButton href={url} rel="noreferrer" target="_blank"><Download data-icon="inline-start" />PDF öffnen</AnchorButton>
      </>}
    >
      <Field label="Artikelbezeichnung">
        <select value={mode} onChange={(event) => setMode(event.target.value as ArticleNameMode)}>
          <option value="short">Kurzbezeichnung</option>
          <option value="full">Vollständiger Name</option>
          <option value="both">Kurzbezeichnung und vollständiger Name</option>
        </select>
      </Field>
      <p className="form-hint">Fehlt eine Kurzbezeichnung, wird der vollständige Name angezeigt.</p>
    </Dialog>
  </>;
}
