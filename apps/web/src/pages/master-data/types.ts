export type ArticleFilters = {
  category: string;
  criticalDefault: boolean;
  medicalDevice: boolean;
  mtkRequired: boolean;
  q: string;
  stkRequired: boolean;
};

export type DeviceFilters = {
  active: string;
  articleId: string;
  locationId: string;
  q: string;
};
