import { useState } from "react";
import { Tabs } from "../../components/ui";
import { DeviceControls } from "./device-controls";
import { DeviceRequirements } from "./device-requirements";
import { Inspections } from "./inspections";
import type { Device, Person } from "./types";

export function DeviceEvidence({ device, people }: { device: Device; people: Person[] }) {
  const [tab, setTab] = useState("inspections");
  const isGlucoseDevice = /blutzucker|\bbz\b/i.test(`${device.mpgModel?.productType ?? ""} ${device.mpgModel?.name ?? ""}`);
  const items = [
    { value: "inspections", label: "Prüfnachweise" },
    { value: "requirements", label: "Anforderungen" },
    { value: "incidents", label: "Vorkommnisse" },
    ...(isGlucoseDevice ? [{ value: "glucose", label: "BZ-Kontrollen" }] : [])
  ];
  return <div className="mpg-evidence">
    <Tabs items={items} label="Prüfungen und Nachweise" onChange={setTab} value={tab} />
    {tab === "inspections" ? <Inspections device={device} people={people} /> : null}
    {tab === "requirements" ? <DeviceRequirements device={device} /> : null}
    {tab === "incidents" ? <DeviceControls device={device} people={people} view="incidents" /> : null}
    {tab === "glucose" && isGlucoseDevice ? <DeviceControls device={device} people={people} view="glucose" /> : null}
  </div>;
}
