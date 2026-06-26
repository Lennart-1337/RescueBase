export type ReorderDirection = "up" | "down" | "start" | "end";

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) return items;
  next.splice(toIndex, 0, item);
  return next;
}

export function reorderVisibleIds(allIds: string[], visibleIds: string[], targetId: string, direction: ReorderDirection) {
  const fromIndex = visibleIds.indexOf(targetId);
  const toIndex = targetIndex(visibleIds.length, fromIndex, direction);
  if (fromIndex < 0 || toIndex === fromIndex) return allIds;
  const reorderedVisibleIds = moveItem(visibleIds, fromIndex, toIndex);
  const visibleIdSet = new Set(visibleIds);
  let visibleIndex = 0;
  return allIds.map((id) => {
    if (!visibleIdSet.has(id)) return id;
    const nextId = reorderedVisibleIds[visibleIndex++];
    return nextId ?? id;
  });
}

function targetIndex(length: number, currentIndex: number, direction: ReorderDirection) {
  if (currentIndex < 0) return currentIndex;
  if (direction === "start") return 0;
  if (direction === "end") return length - 1;
  if (direction === "up") return Math.max(0, currentIndex - 1);
  return Math.min(length - 1, currentIndex + 1);
}
