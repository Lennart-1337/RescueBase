import type { KeyboardEvent, RefCallback } from "react";
import type { Article } from "../../../lib/types";

type Props = {
  article: Article;
  index: number;
  current: number;
  text: string;
  error?: string;
  dirty: boolean;
  disabled: boolean;
  inputRef: RefCallback<HTMLInputElement>;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChange: (id: string, value: string) => void;
  onPaste: (row: number, text: string) => boolean;
};

export function TargetSheetRow(props: Props) {
  const { article, index, current, text, error } = props;
  const name = article.shortName?.trim() || article.name;
  const deficit = error ? null : Math.max(0, Number(text.trim()) - current);
  const errorId = `target-error-${article.id}`;
  return (
    <tr data-edited={props.dirty || undefined}>
      <td className="sheet-row-number">{index + 1}</td>
      <th scope="row" className="sheet-name" title={article.name}>{name}</th>
      <td className="sheet-category-value" title={article.category}>{article.category || "—"}</td>
      <td>{article.unit}</td>
      <td className="sheet-numeric">{current}</td>
      <td className="sheet-edit-cell">
        <input
          ref={props.inputRef}
          aria-label={`${name} Mindestmenge`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          disabled={props.disabled}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={text}
          onFocus={(event) => event.target.select()}
          onKeyDown={props.onKeyDown}
          onChange={(event) => props.onChange(article.id, event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            props.onPaste(index, event.clipboardData.getData("text/plain"));
          }}
        />
        {error ? <span id={errorId} className="sheet-cell-error">{error}</span> : null}
      </td>
      <td className={`sheet-numeric${deficit ? " sheet-deficit" : ""}`}>{deficit ?? "—"}</td>
    </tr>
  );
}
