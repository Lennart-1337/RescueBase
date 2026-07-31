import type { ReactNode } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronDown } from "lucide-react";
import { CheckboxField } from "../checkbox-field";
import "./data-table.css";

export type DataTableColumn<Row> = { id: string; label: string; render: (row: Row) => ReactNode; sortValue?: (row: Row) => string | number; width?: string };
export type DataTableSort = { direction: "asc" | "desc"; id: string } | null;

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[]; getRowId: (row: Row) => string; onRowClick: (row: Row) => void;
  onSelectionChange: (ids: string[]) => void; onSortChange: (sort: DataTableSort) => void;
  onVisibleColumnsChange: (ids: string[]) => void; rows: Row[]; selectedIds: string[]; selectedRowId?: string;
  sort: DataTableSort; toolbar?: ReactNode; visibleColumns: string[];
};

export function sortDataTableRows<Row>(rows: Row[], columns: DataTableColumn<Row>[], sort: DataTableSort) {
  if (!sort) return rows;
  const column = columns.find((entry) => entry.id === sort.id);
  if (!column?.sortValue) return rows;
  return [...rows].sort((left, right) => String(column.sortValue!(left)).localeCompare(String(column.sortValue!(right)), "de", { numeric: true }) * (sort.direction === "asc" ? 1 : -1));
}

export function DataTable<Row>(props: DataTableProps<Row>) {
  const columns = props.columns.filter((column) => props.visibleColumns.includes(column.id));
  const selectableIds = props.rows.map(props.getRowId);
  const selectedOnPage = selectableIds.filter((id) => props.selectedIds.includes(id));
  const toggleSort = (id: string) => props.onSortChange(props.sort?.id === id ? { direction: props.sort.direction === "asc" ? "desc" : "asc", id } : { direction: "asc", id });
  const toggleAll = () => props.onSelectionChange(selectedOnPage.length === selectableIds.length ? props.selectedIds.filter((id) => !selectableIds.includes(id)) : [...new Set([...props.selectedIds, ...selectableIds])]);
  const toggleSelection = (id: string) => props.onSelectionChange(props.selectedIds.includes(id) ? props.selectedIds.filter((entry) => entry !== id) : [...props.selectedIds, id]);
  return <div className="data-table">
    <div className="data-table-controls">
      {props.toolbar ? <div className="data-table-toolbar">{props.toolbar}</div> : null}
      <details><summary>Spalten <ChevronDown aria-hidden="true" /></summary>{props.columns.map((column) => <CheckboxField checked={props.visibleColumns.includes(column.id)} compact key={column.id} label={column.label} onChange={() => props.onVisibleColumnsChange(props.visibleColumns.includes(column.id) ? props.visibleColumns.filter((id) => id !== column.id) : [...props.visibleColumns, column.id])} />)}</details>
    </div>
    <table><colgroup><col className="data-table-selection-column" />{columns.map((column) => <col key={column.id} style={{ width: column.width }} />)}</colgroup><thead><tr>
      <th scope="col"><input aria-label="Alle sichtbaren Zeilen auswählen" checked={selectableIds.length > 0 && selectedOnPage.length === selectableIds.length} onChange={toggleAll} type="checkbox" /></th>
      {columns.map((column) => { const direction = props.sort?.id === column.id ? props.sort.direction : null; const Icon = direction === null ? ArrowDownUp : direction === "asc" ? ArrowUp : ArrowDown; return <th aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"} key={column.id} scope="col">{column.sortValue ? <button aria-label={`${column.label} sortieren`} onClick={() => toggleSort(column.id)} type="button">{column.label}<span className="data-table-sort-icon" data-direction={direction ?? "none"} key={direction ?? "none"}><Icon aria-hidden="true" data-direction={direction ?? "none"} /></span></button> : column.label}</th>; })}
    </tr></thead><tbody>{props.rows.map((row) => { const id = props.getRowId(row); return <tr aria-selected={props.selectedRowId === id} key={id} onClick={() => props.onRowClick(row)}><td onClick={(event) => event.stopPropagation()}><input aria-label={`${id} auswählen`} checked={props.selectedIds.includes(id)} onChange={() => toggleSelection(id)} type="checkbox" /></td>{columns.map((column) => <td key={column.id}>{column.render(row)}</td>)}</tr>; })}</tbody></table>
  </div>;
}
