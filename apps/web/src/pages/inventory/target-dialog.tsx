import { SearchableSelect } from "../../components/searchable-select";
import { InlineError } from "../../components/state-panels";
import { Button, Dialog, Field } from "../../components/ui";
import type { Article, Location } from "../../lib/types";
import type { TargetDraft } from "./types";

export function TargetDialog(props: {
  articles: Article[];
  draft: TargetDraft;
  error: Error | null;
  isOpen: boolean;
  isSubmitting: boolean;
  locations: Location[];
  onChange: (draft: TargetDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog
      actions={<><Button disabled={props.isSubmitting} onClick={props.onSubmit} type="button">Soll speichern</Button><Button onClick={props.onClose} type="button" variant="secondary">Abbrechen</Button></>}
      description="Sollbestand pro Artikel und Standort festlegen."
      onClose={props.onClose}
      open={props.isOpen}
      title="Sollbestand"
    >
      <div className="form-grid form-grid-three">
        <Field label="Artikel">
          <SearchableSelect
            onChange={(articleId) => props.onChange({ ...props.draft, articleId })}
            options={props.articles.map((article) => ({ label: article.name, value: article.id }))}
            value={props.draft.articleId}
          />
        </Field>
        <Field label="Standort">
          <SearchableSelect
            onChange={(locationId) => props.onChange({ ...props.draft, locationId })}
            options={props.locations.map((location) => ({ label: location.name, value: location.id }))}
            value={props.draft.locationId}
          />
        </Field>
        <Field label="Soll">
          <input
            min="1"
            onChange={(event) => props.onChange({ ...props.draft, targetQuantity: event.target.value })}
            type="number"
            value={props.draft.targetQuantity}
          />
        </Field>
      </div>
      {props.error ? <InlineError error={props.error} /> : null}
    </Dialog>
  );
}
