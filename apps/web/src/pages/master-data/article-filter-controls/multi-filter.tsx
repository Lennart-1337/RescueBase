import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CheckboxField } from "../../../components/ui";
export type FilterOption = { label: string; value: string };

export function MultiFilter({ label, emptyLabel, options, value, onChange }: {
  label: string; emptyLabel: string; options: FilterOption[]; value: string[];
  onChange: (value: string[]) => void;
}) {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!details.current?.contains(event.target as Node)) details.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const matches = options.filter((option) => option.label.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de")));
  return (
    <div className="article-multi-field">
      <span id={id}>{label}</span>
      <details className="article-multi" ref={details} onKeyDown={(event) => {
        if (event.key === "Escape") { details.current?.removeAttribute("open"); details.current?.querySelector("summary")?.focus(); }
      }} onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) details.current?.removeAttribute("open");
      }}>
        <summary aria-labelledby={`${id} ${id}-value`}>
          <span id={`${id}-value`}>{value.length ? `${value.length} ausgewählt` : emptyLabel}</span>
          <ChevronDown aria-hidden="true" size={16} />
        </summary>
        <div className="article-multi-menu">
          <div className="field"><input aria-label={`${label} durchsuchen`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="article-multi-options">
            {matches.map((option) => <CheckboxField compact key={option.value} label={option.label}
              checked={value.includes(option.value)} onChange={(event) => onChange(event.target.checked
                ? [...value, option.value] : value.filter((entry) => entry !== option.value))} />)}
            {matches.length === 0 ? <p>Keine passenden Werte</p> : null}
          </div>
        </div>
      </details>
    </div>
  );
}
