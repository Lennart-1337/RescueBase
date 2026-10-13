export type AlertCategory = "EXPIRY" | "SHORTAGE" | "KIT_CHECK_DUE";
export type AlertSource = "BATCH" | "INVENTORY_TARGET" | "KIT";

export type AlertWarning = {
  category: AlertCategory;
  sourceType: AlertSource;
  sourceId: string;
  locationId: string | null;
  locationName: string | null;
  title: string;
  details: string;
  dueAt: string;
  metadata: Record<string, unknown>;
};

export type BatchInput = {
  id: string;
  articleId: string;
  articleName: string;
  locationId: string;
  locationName: string;
  lotNumber: string;
  expiresAt: Date;
  quantity: number;
};

export type TargetInput = {
  id: string;
  articleId: string;
  articleName: string;
  locationId: string;
  locationName: string;
  targetQuantity: number;
  currentQuantity: number;
  shortageQuantity: number;
  unit: string;
};

export type KitInput = {
  id: string;
  name: string;
  code: string;
  locationId: string;
  locationName: string;
  createdAt: Date;
  lastCheckedAt: Date | null;
};

