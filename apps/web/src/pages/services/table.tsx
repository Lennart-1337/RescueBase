import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "../../components/data-table/data-table";
import { Button } from "../../components/ui";
export function ServiceTable<T extends { id: string }>({
  rows,
  columns,
  empty = "Noch keine Einträge.",
  onSelect,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  empty?: string;
  onSelect?: (row: T) => void;
}) {
  const [sort, setSort] = useState<DataTableSort>(null);
  const [visible, setVisible] = useState(columns.map((column) => column.id));
  const [page, setPage] = useState(0);
  const sorted = sort
    ? [...rows].sort(
        (left, right) =>
          String(
            columns
              .find((column) => column.id === sort.id)
              ?.sortValue?.(left) ?? "",
          ).localeCompare(
            String(
              columns
                .find((column) => column.id === sort.id)
                ?.sortValue?.(right) ?? "",
            ),
            "de",
            { numeric: true },
          ) * (sort.direction === "asc" ? 1 : -1),
      )
    : rows;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 20) - 1),
  );
  return rows.length ? (
    <>
      <DataTable
        rows={sorted.slice(currentPage * 20, currentPage * 20 + 20)}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={onSelect}
        onSortChange={setSort}
        onVisibleColumnsChange={setVisible}
        selectedIds={[]}
        sort={sort}
        visibleColumns={visible}
      />
      {rows.length > 20 ? (
        <div className="service-pagination">
          <span>
            {currentPage * 20 + 1}–
            {Math.min(currentPage * 20 + 20, rows.length)} von {rows.length}
          </span>
          <Button
            variant="ghost"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Zurück
          </Button>
          <Button
            variant="ghost"
            disabled={(currentPage + 1) * 20 >= rows.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Weiter
          </Button>
        </div>
      ) : null}
    </>
  ) : (
    <p className="service-empty">{empty}</p>
  );
}
