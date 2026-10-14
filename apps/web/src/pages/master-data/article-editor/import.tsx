import type { Dispatch, SetStateAction } from "react";
import type { Supplier } from "../../../lib/types";
import { Button, CheckboxField } from "../../../components/ui";
import type { ArticleDraft } from "./draft";
import { labels } from "./import-data";
import { useArticleImport } from "./use-article-import";

export function ArticleImport(props: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
  suppliers: Supplier[];
}) {
  const { loading, error, notice, review, load, apply, setReview } =
    useArticleImport(props);
  return (
    <section className="article-import" aria-label="Produktdaten übernehmen">
      <Button
        type="button"
        variant="ghost"
        loading={loading}
        disabled={!props.draft.articleUrl.trim()}
        onClick={() => void load()}
      >
        Daten von Meier laden
      </Button>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {review ? (
        <>
          <p>
            Felder zur Übernahme auswählen. Bereits ausgefüllte Felder werden
            nur nach Auswahl ersetzt.
          </p>
          <div className="article-import-fields">
            {review.candidates.map((entry) => (
              <CheckboxField
                key={entry.key}
                checked={entry.selected}
                label={`${labels[entry.key]}: ${typeof entry.value === "boolean" ? (entry.value ? "Ja" : "Nein") : entry.label}`}
                onChange={(event) =>
                  setReview((value) =>
                    value
                      ? {
                          ...value,
                          candidates: value.candidates.map((candidate) =>
                            candidate.key === entry.key
                              ? { ...candidate, selected: event.target.checked }
                              : candidate,
                          ),
                        }
                      : null,
                  )
                }
              />
            ))}
          </div>
          {review.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          <Button
            type="button"
            onClick={apply}
            disabled={!review.candidates.some((entry) => entry.selected)}
          >
            Ausgewählte Daten übernehmen
          </Button>
        </>
      ) : null}
    </section>
  );
}
