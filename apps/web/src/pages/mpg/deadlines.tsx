import { Link } from "@tanstack/react-router";
import { MpgTable } from "./shared";
import { displayDate, statusLabel, type Device } from "./types";

export function Deadlines({ devices }: { devices: Device[] }) {
  const rows = devices.flatMap(device => (device.requirements ?? []).map(requirement => ({ device, requirement })))
    .filter(row => row.requirement.dueDate).sort((a, b) => String(a.requirement.dueDate).localeCompare(String(b.requirement.dueDate)));
  return <section><h2>Termine und Sperren</h2><MpgTable headings={["Fälligkeit", "Gerät", "Prüfung", "Status"]} empty={!rows.length}>{rows.map(({ device, requirement }) => <tr key={`${device.id}-${requirement.id}`}><td>{displayDate(requirement.dueDate)}</td><td><Link to="/admin/mpg" search={{ device: device.id, view: "devices" }}>{device.name}</Link></td><td>{requirement.title}</td><td>{statusLabel(device.status)}</td></tr>)}</MpgTable></section>;
}
