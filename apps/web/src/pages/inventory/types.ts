export type InventoryFilters = {
  articleId: string;
  expiryOrder: "asc" | "desc";
  locationId: string;
  q: string;
  showEmpty: boolean;
  showExpired: boolean;
};

export type ReceiptDraftItem = {
  lotNumber: string;
  expiresAt: string;
  quantity: string;
};
