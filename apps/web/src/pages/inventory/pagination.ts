export const INVENTORY_LIST_PAGE_SIZE = 10;

export function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / pageSize)));
}

export function paginateItems<Item>(items: Item[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
