import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./searchable-select-help.css";

export function useSelectedHelp(label: string | undefined, anchor: RefObject<HTMLDivElement | null>) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = Boolean(label && (hovered || focused) && !dismissed);
  useEffect(() => {
    if (!visible) return;
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [visible]);
  return {
    descriptionId: visible ? id : undefined,
    onMouseEnter: () => { setHovered(true); setDismissed(false); },
    onMouseLeave: () => setHovered(false),
    onFocus: () => { setFocused(true); setDismissed(false); },
    onBlur: () => setFocused(false),
    dismiss: () => setDismissed(true),
    tooltip: visible ? <SelectedHelp anchor={anchor} id={id} label={label!} /> : null
  };
}

function SelectedHelp({ anchor, id, label }: {
  anchor: RefObject<HTMLDivElement | null>; id: string; label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    const update = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect || !ref.current) return;
      const help = ref.current.getBoundingClientRect();
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - help.width - 8)),
        top: rect.top >= help.height + 8 ? rect.top - help.height : Math.min(rect.bottom, window.innerHeight - help.height - 8)
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor, label]);
  return createPortal(<div className="searchable-select-help" id={id} ref={ref} role="tooltip" style={position}>
    <span>{label}</span>
  </div>, document.body);
}
