export type InventoryFilters = {
  articleId: string;
  locationId: string;
  q: string;
  showEmpty: boolean;
};

export type TargetDraft = {
  articleId: string;
  locationId: string;
  targetQuantity: string;
};

export type ReceiptDraftItem = {
  lotNumber: string;
  expiresAt: string;
  quantity: string;
};
