import type { Kit, Location } from "../../lib/types";
import type { MedicalDevice } from "../../lib/extra-api";

type DeviceStorageOption = { keywords?: string[]; label: string; value: string };

const kitPrefix = "kit:";
const locationPrefix = "location:";

export function buildDeviceStorageOptions(locations: Location[], kits: Kit[]): DeviceStorageOption[] {
  return [
    ...locations.map((location) => ({ label: location.name, value: encodeLocationStorage(location.id) })),
    ...kits.map((kit) => ({ keywords: ["Rucksack", kit.code, kit.location?.name ?? ""], label: kit.name, value: encodeKitStorage(kit.id) }))
  ];
}

export function buildDeviceLocationFilterOptions(locations: Location[], kits: Kit[]) {
  return [
    ...locations.map((location) => ({ label: location.name, value: location.id })),
    ...kits.map((kit) => ({ keywords: ["Rucksack", kit.code, kit.location?.name ?? ""], label: kit.name, value: kit.id }))
  ];
}

export function decodeDeviceStorage(value: string) {
  if (value.startsWith(kitPrefix)) return { kitId: value.slice(kitPrefix.length), locationId: undefined };
  if (value.startsWith(locationPrefix)) return { kitId: undefined, locationId: value.slice(locationPrefix.length) };
  return { kitId: undefined, locationId: undefined };
}

export function deviceStorageLabel(device: MedicalDevice) {
  return device.kit?.name ?? device.location.name;
}

export function encodeKitStorage(id: string) {
  return `${kitPrefix}${id}`;
}

export function encodeLocationStorage(id: string) {
  return `${locationPrefix}${id}`;
}

export function selectedDeviceStorageValue(selection: { kitId?: string | null; locationId?: string | null }) {
  if (selection.kitId) return encodeKitStorage(selection.kitId);
  if (selection.locationId) return encodeLocationStorage(selection.locationId);
  return "";
}
