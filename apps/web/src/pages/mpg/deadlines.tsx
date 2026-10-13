import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { ListFilterBar } from "../../components/list-filter-bar";
import { PageToolbar } from "../../components/page-layout";
import { Field } from "../../components/ui";
import { MpgDataTable } from "./data-table";
import { MpgStatus } from "./shared";
import { displayDate, statusLabel, type Device, type Requirement } from "./types";

type DeadlineFilter = "ALL" | "OVERDUE" | "UPCOMING" | "BLOCKED";
type DeadlineRow = { id: string; device: Device; requirement?: Requirement; dueDate?: string; category: Exclude<DeadlineFilter, "ALL"> | "LATER" };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const reasonText = (reason: Device["reasons"][number]) => typeof reason === "string" ? reason : reason.message ?? reason.reason ?? reason.code ?? "Sperrgrund dokumentiert";

function deadlineRows(devices: Device[], today: string, upcomingUntil: string): DeadlineRow[] {
  return devices.flatMap(device => {
    const checks: DeadlineRow[] = device.status === "RETIRED" ? [] : (device.requirements ?? [])
      .filter(requirement => requirement.dueDate)
      .map(requirement => {
        const dueDate = requirement.dueDate!.slice(0, 10);
        return { id: `${device.id}-${requirement.id}`, device, requirement, dueDate,
          category: dueDate < today ? "OVERDUE" : dueDate <= upcomingUntil ? "UPCOMING" : "LATER" };
      });
    return device.status === "BLOCKED" ? [{ id: `${device.id}-blocked`, device, category: "BLOCKED" as const }, ...checks] : checks;
  }).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}

export function Deadlines({ devices }: { devices: Device[] }) {
  const [filter, setFilter] = useState<DeadlineFilter>("ALL");
  const now = new Date();
  const today = dateKey(now), upcomingUntil = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
  const rows = deadlineRows(devices, today, upcomingUntil);
  const visible = filter === "ALL" ? rows : rows.filter(row => row.category === filter);
  const count = (category: DeadlineRow["category"]) => rows.filter(row => row.category === category).length;
  const columns: DataTableColumn<DeadlineRow>[] = [
    { id: "due", label: "Fälligkeit", render: row => row.dueDate ? displayDate(row.dueDate) : "—", sortValue: row => row.dueDate ?? "", width: "150px" },
    { id: "device", label: "Gerät", render: row => <Link to="/admin/mpg" search={{ device: row.device.id, view: "devices" }}>{row.device.name}</Link>, sortValue: row => row.device.name },
    { id: "inspection", label: "Anlass", render: row => row.requirement?.title ?? <><strong>Gerät gesperrt</strong><small>{row.device.reasons.map(reasonText).join(" · ") || "Sperrgründe in der Geräteakte prüfen"}</small></>, sortValue: row => row.requirement?.title ?? "Gerät gesperrt" },
    { id: "state", label: "Einordnung", render: row => row.category === "OVERDUE" ? "Überfällig" : row.category === "UPCOMING" ? "Binnen 30 Tagen" : row.category === "BLOCKED" ? "Sperre" : "Später", sortValue: row => row.category, width: "150px" },
    { id: "status", label: "Gerätestatus", render: row => <MpgStatus value={row.device.status} />, sortValue: row => statusLabel(row.device.status), width: "150px" }
  ];
  return <section className="mpg-section"><header className="mpg-section-header"><div><h2>Termine und Sperren</h2><p>{count("OVERDUE")} überfällig · {count("UPCOMING")} binnen 30 Tagen · {count("BLOCKED")} gesperrt</p></div></header>
    <PageToolbar label="Termine und Sperren filtern"><ListFilterBar countLabel={`${visible.length}/${rows.length} sichtbar`} fieldsClassName="form-grid-two" onReset={() => setFilter("ALL")}>
      <Field label="Zeitraum und Sperren"><select value={filter} onChange={event => setFilter(event.target.value as DeadlineFilter)}><option value="ALL">Alle</option><option value="OVERDUE">Überfällig</option><option value="UPCOMING">Binnen 30 Tagen</option><option value="BLOCKED">Gesperrt</option></select></Field>
    </ListFilterBar></PageToolbar>
    <MpgDataTable columns={columns} emptyMessage="Keine Einträge für diesen Filter vorhanden." getRowId={row => row.id} rows={visible} />
  </section>;
}
