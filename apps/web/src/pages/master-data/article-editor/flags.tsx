import type { Dispatch, SetStateAction } from "react";
import type { ArticleDraft } from "./draft";
import { CheckboxField, Field } from "../../../components/ui";

export function ArticleFlags({
  draft,
  setDraft,
}: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
}) {
  return (
    <section aria-label="Artikelmerkmale" className="article-editor-flags">
      <h3>Merkmale</h3>
      {(
        [
          ["sterile", "Steril"],
          ["medicalDevice", "Medizinprodukt (MPDG)"],
        ] as const
      ).map(([key, label]) => (
        <CheckboxField
          key={key}
          checked={draft[key]}
          className="article-editor-toggle"
          label={label}
          onChange={(event) =>
            setDraft((current) => ({ ...current, [key]: event.target.checked }))
          }
        />
      ))}
      {(["stk", "mtk"] as const).map((kind) => {
        const required = `${kind}Required` as const;
        const interval = `${kind}IntervalMonths` as const;
        const label = kind.toUpperCase();
        return (
          <div className="article-editor-toggle-group" key={kind}>
            <CheckboxField
              checked={draft[required]}
              className="article-editor-toggle"
              label={`${label} erforderlich`}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [required]: event.target.checked,
                  [interval]: event.target.checked
                    ? current[interval] || "12"
                    : "",
                }))
              }
            />
            {draft[required] ? (
              <Field
                className="article-editor-interval"
                label={`${label}-Intervall (Monate)`}
              >
                <input
                  inputMode="numeric"
                  min="1"
                  type="number"
                  value={draft[interval]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [interval]: event.target.value,
                    }))
                  }
                />
              </Field>
            ) : null}
          </div>
        );
      })}
      <CheckboxField
        checked={draft.criticalDefault}
        className="article-editor-toggle"
        label="Kritisch als Standard"
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            criticalDefault: event.target.checked,
          }))
        }
      />
    </section>
  );
}
