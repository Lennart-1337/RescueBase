export const kit = {
  id: "kit-rucksack-1",
  name: "Rucksack Fahrzeug 1",
  code: "SAN-RS-001",
  locationId: "loc-rtw-1",
  templateId: "template-san-a-v1",
  status: "READY",
  publicToken: "SAN-RS-001-ZUGANG-2026",
  tokenRotatedAt: "2026-06-11T00:00:00.000Z",
  location: { id: "loc-rtw-1", name: "Fahrzeug 1" },
  template: { id: "template-san-a-v1", name: "Sanitätsrucksack A", version: 1, positions: [] }
};

export const batch = {
  id: "batch-bandage-1",
  articleId: "article-bandage",
  lotNumber: "VB-2026-04",
  expiresAt: "2027-04-30",
  quantity: 120,
  article: { id: "article-bandage", name: "Verbandpäckchen mittel", unit: "Stück" },
  location: { id: "loc-main", name: "Hauptlager" }
};

export const article = {
  id: "article-bandage",
  name: "Verbandpäckchen mittel",
  unit: "Stück",
  manufacturer: "MediSafe",
  manufacturerPartNumber: "VB-1000",
  category: "Verbandmaterial",
  barcode: "040000000001",
  articleUrl: "https://shop.example.org/articles/verbandpaeckchen-mittel",
  sterile: true,
  medicalDevice: false,
  stkRequired: false,
  stkIntervalMonths: null,
  mtkRequired: false,
  mtkIntervalMonths: null,
  storageNotes: "Trocken lagern",
  notes: "Einzeln steril verpackt",
  criticalDefault: false
};
export const location = { id: "loc-main", name: "Hauptlager", kind: "STORAGE" };

export const order = {
  id: "order-1001",
  kitId: "kit-rucksack-1",
  status: "OPEN",
  createdAt: "2026-06-11T09:15:00.000Z",
  updatedAt: "2026-06-11T09:15:00.000Z",
  kit,
  items: [{ articleId: "article-bandage", articleName: "Verbandpäckchen mittel", templatePositionId: "pos-bandage", requestedQuantity: 3, fulfilledQuantity: 0, unit: "Stück", reason: "SHORTAGE", critical: false }]
};
