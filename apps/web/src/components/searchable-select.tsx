import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./ui";

type Option = { label: string; value: string; keywords?: string[] };

export function SearchableSelect(props: {
  ariaLabel?: string;
  disabled?: boolean;
  emptyLabel?: string;
  noResultsLabel?: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  value: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = props.options.find((option) => option.value === props.value) ?? null;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputValue = open ? search : selected?.label ?? "";
  const filteredOptions = useMemo(() => {
    const needle = normalize(search);
    if (!needle) return props.options;
    return props.options.filter((option) => [option.label, ...(option.keywords ?? [])].some((value) => normalize(value).includes(needle)));
  }, [props.options, search]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function commit(option: Option) {
    props.onChange(option.value);
    setSearch("");
    setOpen(false);
  }

  function openWithBlankSearch() {
    setOpen(true);
    setSearch("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openWithBlankSearch();
      setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      openWithBlankSearch();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" && open && filteredOptions[activeIndex]) {
      event.preventDefault();
      commit(filteredOptions[activeIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="searchable-select-root" ref={rootRef}>
      <div
        className={cn(
          "searchable-select",
          open && "searchable-select-open",
          selected && "searchable-select-has-value",
          props.disabled && "searchable-select-disabled"
        )}
      >
        <input
          aria-label={props.ariaLabel}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          disabled={props.disabled}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearch(nextValue);
            setOpen(true);
            if (!nextValue.trim()) props.onChange("");
          }}
          onFocus={openWithBlankSearch}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder ?? props.emptyLabel ?? "Auswählen"}
          role="combobox"
          value={inputValue}
        />
        <ChevronDown aria-hidden="true" className="searchable-select-icon" />
      </div>
      {open && !props.disabled ? (
        <div className="searchable-select-list" id={listboxId} role="listbox">
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <div
              aria-selected={option.value === props.value}
              className={cn("searchable-select-option", index === activeIndex && "searchable-select-option-active")}
              key={option.value || "__empty__"}
              onMouseDown={(event) => {
                event.preventDefault();
                commit(option);
              }}
              role="option"
            >
              <span>{option.label}</span>
              {option.value === props.value ? <Check aria-hidden="true" className="searchable-select-option-check" /> : null}
            </div>
          )) : <div className="searchable-select-empty">{props.noResultsLabel ?? "Keine Treffer"}</div>}
        </div>
      ) : null}
    </div>
  );
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}
