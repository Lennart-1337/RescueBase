import { Link } from "@tanstack/react-router";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { MpgDataTable } from "./data-table";
import { MpgStatus } from "./shared";
import { displayDate, statusLabel, type Device } from "./types";

type DeadlineRow = { id: string; device: Device; requirement: NonNullable<Device["requirements"]>[number] };

export function Deadlines({ devices }: { devices: Device[] }) {
  const rows: DeadlineRow[] = devices.flatMap(device => (device.requirements ?? []).map(requirement => ({ id: `${device.id}-${requirement.id}`, device, requirement })))
    .filter(row => row.requirement.dueDate).sort((a, b) => String(a.requirement.dueDate).localeCompare(String(b.requirement.dueDate)));
  const columns: DataTableColumn<DeadlineRow>[] = [
    { id: "due", label: "Fälligkeit", render: row => displayDate(row.requirement.dueDate), sortValue: row => row.requirement.dueDate ?? "", width: "150px" },
    { id: "device", label: "Gerät", render: row => <Link to="/admin/mpg" search={{ device: row.device.id, view: "devices" }}>{row.device.name}</Link>, sortValue: row => row.device.name },
    { id: "inspection", label: "Prüfung", render: row => row.requirement.title, sortValue: row => row.requirement.title },
    { id: "status", label: "Gerätestatus", render: row => <MpgStatus value={row.device.status} />, sortValue: row => statusLabel(row.device.status), width: "150px" }
  ];
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Termine und Sperren</h2><p>{rows.length} anstehende Prüftermine</p></div></header><MpgDataTable columns={columns} emptyMessage="Keine Prüftermine vorhanden." getRowId={row => row.id} rows={rows} /></section>;
}
