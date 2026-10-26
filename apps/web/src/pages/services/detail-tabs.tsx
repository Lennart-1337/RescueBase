import type { KeyboardEvent } from "react";
import { serviceTabs, type ServiceTab } from "./navigation";
export function DetailTabs({
  tab,
  onTab,
}: {
  tab: ServiceTab;
  onTab: (tab: ServiceTab) => void;
}) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? serviceTabs.length - 1
          : (index +
              (event.key === "ArrowRight" ? 1 : -1) +
              serviceTabs.length) %
            serviceTabs.length;
    const item = serviceTabs[next]!;
    onTab(item.value);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#service-tab-${item.value}`)
      ?.focus();
  }
  return (
    <div
      className="service-detail-tabs"
      role="tablist"
      aria-label="Dienstbereiche"
    >
      {serviceTabs.map((item, index) => (
        <button
          type="button"
          key={item.value}
          id={`service-tab-${item.value}`}
          role="tab"
          tabIndex={tab === item.value ? 0 : -1}
          aria-selected={tab === item.value}
          aria-controls={`service-panel-${item.value}`}
          onClick={() => onTab(item.value)}
          onKeyDown={(event) => move(event, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
