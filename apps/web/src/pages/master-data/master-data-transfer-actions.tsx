import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { CheckboxField, Button, Dialog } from "../../components/ui";
import { rescueBaseApi } from "../../lib/api";
import { createMedicalDevice, listMedicalDevices, updateMedicalDevice, type MedicalDevice } from "../../lib/extra-api";
import type { Article, KitTemplate, Location, Supplier } from "../../lib/types";
import { bundleCounts, importSectionOrder, masterDataSections, parseMasterDataBundle, type MasterDataBundle, type MasterDataSection } from "./master-data-transfer";
import "./master-data-transfer-actions.css";

const labels: Record<MasterDataSection, string> = { articles: "Artikel", suppliers: "Lieferanten", locations: "Lagerorte", templates: "Rucksackvorlagen", devices: "Geräte" };
const defaultSections = new Set<MasterDataSection>(masterDataSections);

export function MasterDataTransferActions() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sections, setSections] = useState(defaultSections);
  const [bundle, setBundle] = useState<MasterDataBundle | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  function toggle(section: MasterDataSection) {
    setSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function exportSelected() {
    setIsWorking(true);
    try {
      const data: MasterDataBundle["data"] = {};
      await Promise.all([...sections].map(async (section) => { data[section] = await loadSection(section); }));
      const blob = new Blob([JSON.stringify({ format: "rescuebase-master-data", version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `rescuebase-stammdaten-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      URL.revokeObjectURL(url); setExportOpen(false);
    } catch (reason) { setError(message(reason)); } finally { setIsWorking(false); }
  }

  async function selectFile(file?: File) {
    if (!file) return;
    try { setError(null); setBundle(parseMasterDataBundle(JSON.parse(await file.text()))); setSelectedFileName(file.name); } catch (reason) { setBundle(null); setSelectedFileName(""); setError(message(reason)); }
  }

  async function importSelected() {
    if (!bundle) return;
    setIsWorking(true);
    try {
      for (const section of importSectionOrder) if (sections.has(section)) await importSection(section, bundle.data[section] ?? []);
      setImportOpen(false); setBundle(null); setError(null); window.location.reload();
    } catch (reason) { setError(message(reason)); } finally { setIsWorking(false); }
  }

  return <>
    <Button onClick={() => { setError(null); setExportOpen(true); }} type="button" variant="secondary"><Download data-icon="inline-start" />Export</Button>
    <Button onClick={() => { setError(null); setBundle(null); setSelectedFileName(""); setImportOpen(true); }} type="button" variant="secondary"><Upload data-icon="inline-start" />Import</Button>
    <Dialog actions={<><Button onClick={() => setExportOpen(false)} type="button" variant="ghost">Abbrechen</Button><Button disabled={!sections.size} loading={isWorking} onClick={() => void exportSelected()} type="button">Export erstellen</Button></>} onClose={() => setExportOpen(false)} open={exportOpen} title="Stammdaten exportieren">
      <p className="form-hint">Wählen Sie die Bereiche für die JSON-Datei aus.</p><SectionChoices sections={sections} onToggle={toggle} />
    </Dialog>
    <Dialog actions={<><Button onClick={() => setImportOpen(false)} type="button" variant="ghost">Abbrechen</Button><Button disabled={!bundle || !sections.size} loading={isWorking} onClick={() => void importSelected()} type="button">Daten aktualisieren</Button></>} onClose={() => setImportOpen(false)} open={importOpen} title="Stammdaten importieren">
      <p className="form-hint">Datensätze mit bekannter ID werden aktualisiert, neue IDs angelegt. Vorlagen erhalten bei einer Aktualisierung eine neue Version.</p>
      <input accept="application/json,.json" aria-hidden="true" className="transfer-file-input" onChange={(event) => void selectFile(event.target.files?.[0])} ref={fileInput} tabIndex={-1} type="file" />
      <div className="transfer-file-picker"><Button onClick={() => fileInput.current?.click()} type="button" variant="secondary"><Upload data-icon="inline-start" />JSON-Datei auswählen</Button>{selectedFileName ? <span>{selectedFileName}</span> : <span>Noch keine Datei gewählt</span>}</div>
      {bundle ? <><div className="transfer-counts">{bundleCounts(bundle).filter(({ count }) => count > 0).map(({ section, count }) => <span key={section}>{labels[section]}: {count}</span>)}</div><SectionChoices available={bundle.data} sections={sections} onToggle={toggle} /></> : null}
      {error ? <p className="transfer-error" role="alert">{error}</p> : null}
    </Dialog>
  </>;
}

function SectionChoices(props: { available?: MasterDataBundle["data"]; sections: Set<MasterDataSection>; onToggle: (section: MasterDataSection) => void }) {
  return <div className="transfer-sections">{masterDataSections.map((section) => <CheckboxField checked={props.sections.has(section)} disabled={props.available ? !props.available[section]?.length : false} key={section} label={labels[section]} onChange={() => props.onToggle(section)} />)}</div>;
}

async function loadSection(section: MasterDataSection) {
  if (section === "articles") return rescueBaseApi.articles(); if (section === "suppliers") return rescueBaseApi.suppliers(); if (section === "locations") return rescueBaseApi.locations(); if (section === "templates") return rescueBaseApi.templates(); return listMedicalDevices();
}

async function importSection(section: MasterDataSection, entries: unknown[]) {
  if (section === "suppliers") return upsertEntries(await rescueBaseApi.suppliers(), entries as Supplier[], (item) => rescueBaseApi.updateSupplier(item.id, supplierBody(item)), (item) => rescueBaseApi.createSupplier(supplierBody(item)));
  if (section === "locations") return upsertEntries(await rescueBaseApi.locations(), entries as Location[], (item) => rescueBaseApi.updateLocation(item.id, locationBody(item)), (item) => rescueBaseApi.createLocation(locationBody(item)));
  if (section === "articles") return upsertEntries(await rescueBaseApi.articles(), entries as Article[], (item) => rescueBaseApi.updateArticle(item.id, articleBody(item)), (item) => rescueBaseApi.createArticle(articleBody(item)));
  if (section === "templates") return upsertEntries(await rescueBaseApi.templates(), entries as KitTemplate[], (item) => rescueBaseApi.reviseTemplate(item.id, { positions: templatePositions(item) }), (item) => rescueBaseApi.createTemplate({ name: item.name, version: item.version, positions: templatePositions(item) }));
  return upsertEntries(await listMedicalDevices(), entries as MedicalDevice[], (item) => updateMedicalDevice(item.id, deviceBody(item)), (item) => createMedicalDevice(deviceBody(item)));
}

async function upsertEntries<T extends { id: string }>(existing: T[], entries: T[], update: (entry: T) => Promise<unknown>, create: (entry: T) => Promise<unknown>) {
  const existingIds = new Set(existing.map(({ id }) => id));
  for (const entry of entries) await (existingIds.has(entry.id) ? update(entry) : create(entry));
}

function supplierBody({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...body }: Supplier) { return body; }
function locationBody({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...body }: Location) { return body; }
function articleBody({ id: _id, defaultSupplierName: _defaultSupplierName, createdAt: _createdAt, updatedAt: _updatedAt, ...body }: Article) { return body; }
function templatePositions(template: KitTemplate) { return template.positions.map(({ articleId, critical, moduleName, requiredQuantity }) => ({ articleId, critical, moduleName, requiredQuantity })); }
function deviceBody(device: MedicalDevice) { return {
    name: device.name,
    articleId: device.articleId,
    locationId: device.kitId ? undefined : device.locationId,
    kitId: device.kitId ?? undefined,
    serialNumber: device.serialNumber ?? undefined,
    inventoryNumber: device.inventoryNumber ?? undefined,
    lastStkAt: device.lastStkAt,
    lastMtkAt: device.lastMtkAt,
    stkIntervalMonths: device.stkIntervalMonths,
    mtkIntervalMonths: device.mtkIntervalMonths,
    active: device.active,
    notes: device.notes ?? undefined
  }; }

function message(reason: unknown) { return reason instanceof Error ? reason.message : "Die Daten konnten nicht verarbeitet werden."; }
