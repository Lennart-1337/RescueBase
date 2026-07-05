const VIEWPORT_MARGIN = 16;
const LIST_GAP = 6;
const LIST_MAX_HEIGHT = 240;
const LIST_MIN_HEIGHT = 120;

export type SearchableSelectPosition = {
  left: number;
  maxHeight: number;
  placement: "bottom" | "top";
  top: number;
  width: number;
};

export function computeSearchableSelectPosition(props: {
  listHeight: number;
  triggerRect: DOMRect;
  viewportHeight: number;
  viewportWidth: number;
}): SearchableSelectPosition {
  const width = Math.min(props.triggerRect.width, props.viewportWidth - VIEWPORT_MARGIN * 2);
  const left = clamp(props.triggerRect.left, VIEWPORT_MARGIN, props.viewportWidth - VIEWPORT_MARGIN - width);
  const topSpace = Math.max(props.triggerRect.top - VIEWPORT_MARGIN - LIST_GAP, 0);
  const bottomSpace = Math.max(props.viewportHeight - props.triggerRect.bottom - VIEWPORT_MARGIN - LIST_GAP, 0);
  const preferredHeight = Math.min(props.listHeight, LIST_MAX_HEIGHT);
  const placement = bottomSpace >= preferredHeight || bottomSpace >= topSpace ? "bottom" : "top";
  const availableSpace = placement === "bottom" ? bottomSpace : topSpace;
  const maxHeight = Math.max(Math.min(availableSpace, LIST_MAX_HEIGHT), Math.min(LIST_MIN_HEIGHT, availableSpace));
  const height = Math.min(preferredHeight, maxHeight || preferredHeight);
  const top = placement === "bottom"
    ? props.triggerRect.bottom + LIST_GAP
    : Math.max(VIEWPORT_MARGIN, props.triggerRect.top - LIST_GAP - height);

  return { left, maxHeight, placement, top, width };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
