import { Link } from "@tanstack/react-router";
import { ExternalLink, Pencil, QrCode, RotateCw } from "lucide-react";
import { statusLabels } from "../../app/formatters";
import { InlineError } from "../../components/state-panels";
import { AnchorButton, Badge, Button, Panel } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import type { Kit } from "../../lib/types";

export function KitListPanel(props: { kits: Kit[]; onEdit: (kit: Kit) => void; onRotate: (id: string) => void; rotateError: Error | null; rotatePending: boolean }) {
  return (
    <Panel>
      <div className="table">
        {props.kits.map((kit) => (
          <div className="table-row kit-row" key={kit.id}>
            <span><strong>{kit.name}</strong><small>{kit.code} · {kit.location?.name}</small></span>
            <Badge tone={kit.status === "READY" ? "ready" : kit.status === "CONDITIONAL" ? "warning" : "danger"}>{statusLabels[kit.status]}</Badge>
            <div className="row-actions">
              <AnchorButton href={rescueBaseApi.reportUrl(`/reports/qr-label/${kit.id}.pdf?format=a4`)} variant="secondary"><QrCode data-icon="inline-start" />A4-PDF</AnchorButton>
              <AnchorButton href={rescueBaseApi.reportUrl(`/reports/qr-label/${kit.id}.pdf?format=label`)} variant="secondary"><QrCode data-icon="inline-start" />Etikett</AnchorButton>
              <Link className="button button-secondary" params={{ token: kit.publicToken }} to="/check/$token"><ExternalLink data-icon="inline-start" />Check öffnen</Link>
              <Button onClick={() => props.onEdit(kit)} type="button" variant="ghost"><Pencil data-icon="inline-start" />Bearbeiten</Button>
              <Button disabled={props.rotatePending} onClick={() => props.onRotate(kit.id)} type="button" variant="ghost"><RotateCw data-icon="inline-start" />Rotieren</Button>
            </div>
          </div>
        ))}
      </div>
      {props.rotateError ? <InlineError error={props.rotateError} /> : null}
    </Panel>
  );
}
