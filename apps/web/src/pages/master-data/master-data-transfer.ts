import type { Article, KitTemplate, Location, Supplier } from "../../lib/types";
import type { MedicalDevice } from "../../lib/extra-api";

export const masterDataSections = ["articles", "suppliers", "locations", "templates", "devices"] as const;
export const importSectionOrder = ["suppliers", "locations", "articles", "templates", "devices"] as const;
export type MasterDataSection = typeof masterDataSections[number];

export type MasterDataBundle = {
  format: "rescuebase-master-data";
  version: 1;
  exportedAt: string;
  data: Partial<Record<MasterDataSection, Article[] | Supplier[] | Location[] | KitTemplate[] | MedicalDevice[]>>;
};

export function parseMasterDataBundle(value: unknown): MasterDataBundle {
  if (!isRecord(value) || value.format !== "rescuebase-master-data" || value.version !== 1 || !isRecord(value.data)) {
    throw new Error("Die Datei ist kein gültiger RescueBase-Stammdatenexport.");
  }
  for (const section of masterDataSections) {
    const entries = value.data[section];
    if (entries !== undefined && !Array.isArray(entries)) throw new Error(`Der Bereich „${section}“ ist ungültig.`);
  }
  return value as MasterDataBundle;
}

export function bundleCounts(bundle: MasterDataBundle) {
  return masterDataSections.map((section) => ({ section, count: bundle.data[section]?.length ?? 0 }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
