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
  template: {
    id: "template-san-a-v1",
    name: "Sanitätsrucksack A",
    version: 1,
    positions: [],
  },
};

export const batch = {
  id: "batch-bandage-1",
  articleId: "article-bandage",
  locationId: "loc-main",
  lotNumber: "VB-2026-04",
  expiresAt: "2027-04-30",
  quantity: 120,
  article: {
    id: "article-bandage",
    name: "Verbandpäckchen mittel",
    unit: "Stück",
  },
  location: { id: "loc-main", name: "Hauptlager" },
};

export const supplier = {
  id: "supplier-medisafe",
  name: "MediSafe Einkauf",
  contactPerson: "Anna Meier",
  email: "einkauf@medisafe.example",
  phone: "+49 40 123456",
  website: "https://medisafe.example",
  street: "Musterstraße 5",
  postalCode: "20095",
  city: "Hamburg",
  country: "Deutschland",
  notes: "Bestellungen bevorzugt per E-Mail",
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
  defaultSupplierId: supplier.id,
  defaultSupplierName: supplier.name,
  unitsPerPackage: 10,
  sterile: true,
  medicalDevice: false,
  stkRequired: false,
  stkIntervalMonths: null,
  mtkRequired: false,
  mtkIntervalMonths: null,
  storageNotes: "Trocken lagern",
  notes: "Einzeln steril verpackt",
  criticalDefault: false,
};
export const location = { id: "loc-main", name: "Hauptlager", kind: "STORAGE" };

export const medicalDevice = {
  id: "device-1",
  name: "Corpuls C3",
  articleId: article.id,
  locationId: location.id,
  kitId: null,
  serialNumber: "SER-1",
  inventoryNumber: "INV-1",
  lastStkAt: null,
  lastMtkAt: null,
  stkIntervalMonths: null,
  mtkIntervalMonths: null,
  active: true,
  notes: null,
  article,
  location,
  kit: null,
};

export const order = {
  id: "order-1001",
  kitId: "kit-rucksack-1",
  status: "OPEN",
  createdAt: "2026-06-11T09:15:00.000Z",
  updatedAt: "2026-06-11T09:15:00.000Z",
  kit,
  items: [
    {
      articleId: "article-bandage",
      articleName: "Verbandpäckchen mittel",
      templatePositionId: "pos-bandage",
      requestedQuantity: 3,
      fulfilledQuantity: 0,
      unit: "Stück",
      reason: "SHORTAGE",
      critical: false,
    },
  ],
};

export const inventoryTarget = {
  id: "target-bandage-main",
  articleId: "article-bandage",
  locationId: "loc-main",
  targetQuantity: 150,
  currentQuantity: 120,
  shortageQuantity: 30,
  article: {
    id: "article-bandage",
    name: "Verbandpäckchen mittel",
    unit: "Stück",
    articleUrl: "https://shop.example.org/articles/verbandpaeckchen-mittel",
    unitsPerPackage: 10,
  },
  location: { id: "loc-main", name: "Hauptlager" },
};

export const purchaseOrder = {
  id: "purchase-order-1",
  orderNumber: "PO-2026-000001",
  supplierId: supplier.id,
  supplierName: "MediSafe Einkauf",
  locationId: "loc-main",
  status: "DRAFT",
  notes: "Bitte gesammelt liefern.",
  archivedAt: undefined,
  totalGrossCents: 996,
  createdAt: "2026-06-26T09:00:00.000Z",
  updatedAt: "2026-06-26T09:00:00.000Z",
  location: { id: "loc-main", name: "Hauptlager" },
  lines: [
    {
      id: "purchase-line-1",
      articleId: "article-bandage",
      articleName: "Verbandpäckchen mittel",
      supplierArticleNumber: "VB-1000",
      articleUrl: "https://shop.example.org/articles/verbandpaeckchen-mittel",
      manufacturerPartNumber: "VB-1000",
      unit: "Stück",
      grossUnitPriceCents: 249,
      orderedQuantity: 4,
      receivedQuantity: 0,
      remainingQuantity: 4,
      lineTotalGrossCents: 996,
    },
  ],
  receipts: [],
};
