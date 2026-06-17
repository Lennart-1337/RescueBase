import { Archive, Plus, X } from "lucide-react";
import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field } from "../../components/ui";
import type { Article, Location } from "../../lib/types";

export function BatchCreatePanel(props: { articleId: string; articles: Article[]; createError: Error | null; expiresAt: string; isOpen: boolean; locationId: string; locations: Location[]; lotNumber: string; onArticleChange: (value: string) => void; onClose: () => void; onCreate: () => void; onExpiresAtChange: (value: string) => void; onLocationChange: (value: string) => void; onLotNumberChange: (value: string) => void; onQuantityChange: (value: number) => void; quantity: number }) {
  const selectedArticleId = props.articleId || props.articles[0]?.id || "";
  const selectedLocationId = props.locationId || props.locations[0]?.id || "";
  const canCreate = Boolean(selectedArticleId && selectedLocationId && props.lotNumber.trim() && props.expiresAt && props.quantity >= 0);
  return (
    <Dialog actions={<><Button onClick={props.onClose} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!canCreate} onClick={props.onCreate} type="button"><Plus data-icon="inline-start" />Charge erfassen</Button></>} description="Neue Bestände werden chargengenau mit Ablaufdatum angelegt." onClose={props.onClose} open={props.isOpen} title="Charge erfassen">
      <div className="form-grid form-grid-five">
        <Field label="Artikel"><SearchableSelect onChange={props.onArticleChange} options={props.articles.map((article) => ({ label: article.name, value: article.id }))} value={selectedArticleId} /></Field>
        <Field label="Lagerort"><SearchableSelect onChange={props.onLocationChange} options={props.locations.map((location) => ({ label: location.name, value: location.id }))} value={selectedLocationId} /></Field>
        <Field label="Chargennummer"><input value={props.lotNumber} onChange={(event) => props.onLotNumberChange(event.target.value)} /></Field>
        <Field label="Ablaufdatum"><input type="date" value={props.expiresAt} onChange={(event) => props.onExpiresAtChange(event.target.value)} /></Field>
        <Field label="Menge"><input min="0" onChange={(event) => props.onQuantityChange(Number(event.target.value))} type="number" value={props.quantity} /></Field>
      </div>
      <div className="debug-hint"><Archive data-icon="inline-start" /> Bestände werden ausschließlich als neue Charge angelegt, nicht direkt auf vorhandene Chargen addiert.</div>
      {props.createError ? <InlineError error={props.createError} /> : null}
    </Dialog>
  );
}
