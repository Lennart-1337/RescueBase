import { useMemo, useState } from "react";
import { DataTable, sortDataTableRows, type DataTableColumn, type DataTableSort } from "../../components/data-table/data-table";
import { ListPagination } from "../../components/list-pagination";

export function MpgDataTable<Row>({ columns, emptyMessage = "Es sind noch keine Einträge vorhanden.", getRowId, onRowClick, rows }: {
  columns: DataTableColumn<Row>[];
  emptyMessage?: string;
  getRowId: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  rows: Row[];
}) {
  const [sort, setSort] = useState<DataTableSort>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map((column) => column.id));
  const sortedRows = useMemo(() => sortDataTableRows(rows, columns, sort), [columns, rows, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <div className="mpg-table-frame">
    <DataTable columns={columns} getRowId={getRowId} onRowClick={onRowClick} onSortChange={setSort} onVisibleColumnsChange={setVisibleColumns} rows={pagedRows} selectedIds={[]} sort={sort} visibleColumns={visibleColumns} />
    {rows.length === 0 ? <p className="mpg-table-empty">{emptyMessage}</p> : null}
    <ListPagination label="Tabellenseiten" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} page={currentPage} pageSize={pageSize} pageSizeOptions={[10, 25, 50]} total={rows.length} />
  </div>;
}
