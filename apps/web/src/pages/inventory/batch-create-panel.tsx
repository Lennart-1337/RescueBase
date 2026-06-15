import { Archive, Plus } from "lucide-react";
import { InlineError } from "../../components/state-panels";
import { Button, Field, Panel } from "../../components/ui";
import type { Article, Location } from "../../lib/types";

export function BatchCreatePanel(props: { articleId: string; articles: Article[]; createError: Error | null; expiresAt: string; locationId: string; locations: Location[]; lotNumber: string; onArticleChange: (value: string) => void; onCreate: () => void; onExpiresAtChange: (value: string) => void; onLocationChange: (value: string) => void; onLotNumberChange: (value: string) => void; onQuantityChange: (value: number) => void; quantity: number }) {
  const selectedArticleId = props.articleId || props.articles[0]?.id || "";
  const selectedLocationId = props.locationId || props.locations[0]?.id || "";
  const canCreate = Boolean(selectedArticleId && selectedLocationId && props.lotNumber.trim() && props.expiresAt && props.quantity >= 0);
  return (
    <Panel>
      <div className="panel-header"><div><h2>Charge erfassen</h2><p>Neue Bestände werden chargengenau mit Ablaufdatum angelegt.</p></div><Archive /></div>
      <div className="form-grid form-grid-five">
        <Field label="Artikel"><select value={selectedArticleId} onChange={(event) => props.onArticleChange(event.target.value)}>{props.articles.map((article) => <option key={article.id} value={article.id}>{article.name}</option>)}</select></Field>
        <Field label="Lagerort"><select value={selectedLocationId} onChange={(event) => props.onLocationChange(event.target.value)}>{props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        <Field label="Chargennummer"><input value={props.lotNumber} onChange={(event) => props.onLotNumberChange(event.target.value)} /></Field>
        <Field label="Ablaufdatum"><input type="date" value={props.expiresAt} onChange={(event) => props.onExpiresAtChange(event.target.value)} /></Field>
        <Field label="Menge"><input min="0" onChange={(event) => props.onQuantityChange(Number(event.target.value))} type="number" value={props.quantity} /></Field>
      </div>
      {props.createError ? <InlineError error={props.createError} /> : null}
      <div className="form-actions"><Button disabled={!canCreate} onClick={props.onCreate} type="button"><Plus data-icon="inline-start" />Charge erfassen</Button></div>
    </Panel>
  );
}
