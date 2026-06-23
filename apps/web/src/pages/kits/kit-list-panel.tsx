import { Link } from "@tanstack/react-router";
import { ExternalLink, Pencil, QrCode, RotateCw, Trash2 } from "lucide-react";
import { statusLabels } from "../../app/formatters";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { Kit } from "../../lib/types";

export function KitListPanel(props: {
  actionError: Error | null;
  actionPending: boolean;
  kits: Kit[];
  onDelete: (id: string) => void;
  onEdit: (kit: Kit) => void;
  onRotate: (id: string) => void;
}) {
  function confirmDelete(kit: Kit) {
    if (window.confirm(`Rucksack "${kit.name}" wirklich löschen?`)) {
      props.onDelete(kit.id);
    }
  }

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Rucksäcke</h2></div>
      </div>
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
