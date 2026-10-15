import { useRef, type KeyboardEvent } from "react";
import type { Article } from "../../../lib/types";
import { TargetSheetRow } from "./sheet-row";

type Props = {
  articles: Article[];
  values: Record<string, string>;
  errors: Record<string, string>;
  dirtyIds: string[];
  stock: Map<string, number>;
  disabled: boolean;
  onChange: (id: string, value: string) => void;
  onPaste: (row: number, text: string) => boolean;
};
export function TargetTable(props: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const dirty = new Set(props.dirtyIds);
  function move(event: KeyboardEvent<HTMLInputElement>, index: number) {
    const offset =
      event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)
        ? -1
        : 1;
    if (!["Enter", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    inputs.current[index + offset]?.focus();
  }
  return (
    <div
      className="target-sheet-scroll"
      tabIndex={0}
      role="region"
      aria-label="Mindestbestandstabelle"
    >
      <table className="target-sheet" aria-label="Mindestbestände">
        <colgroup>
          <col className="sheet-number" />
          <col className="sheet-article" />
          <col className="sheet-category" />
          <col className="sheet-unit" />
          <col className="sheet-quantity" />
          <col className="sheet-quantity" />
          <col className="sheet-quantity" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" aria-label="Zeile">
              #
            </th>
            <th scope="col">Artikel</th>
            <th scope="col">Kategorie</th>
            <th scope="col">Einheit</th>
            <th scope="col" className="sheet-numeric">
              Verfügbar
            </th>
            <th scope="col" className="sheet-edit-header">
              Mindestmenge
            </th>
            <th scope="col" className="sheet-numeric">
              Fehlmenge
            </th>
          </tr>
        </thead>
        <tbody>
          {props.articles.map((article, index) => (
            <TargetSheetRow
              key={article.id}
              article={article}
              index={index}
              current={props.stock.get(article.id) ?? 0}
              text={props.values[article.id] ?? "0"}
              error={props.errors[article.id]}
              dirty={dirty.has(article.id)}
              disabled={props.disabled}
              inputRef={(element) => { inputs.current[index] = element; }}
              onKeyDown={(event) => move(event, index)}
              onChange={props.onChange}
              onPaste={props.onPaste}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
