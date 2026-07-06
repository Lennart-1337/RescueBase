import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button, Field } from "./ui";
import "./list-pagination.css";

export function ListPagination(props: {
  label: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(props.total / props.pageSize));
  const start = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1;
  const end = Math.min(props.page * props.pageSize, props.total);
  return (
    <nav aria-label={props.label} className="list-pagination">
      <div className="list-pagination-meta">
        {props.onPageSizeChange ? (
          <Field className="list-pagination-size" label="Einträge pro Seite">
            <select aria-label="Einträge pro Seite" onChange={(event) => props.onPageSizeChange?.(Number(event.target.value))} value={props.pageSize}>
              {(props.pageSizeOptions ?? [10, 25, 50]).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
        ) : null}
        <span className="list-pagination-summary">{start}-{end} von {props.total}</span>
        <span className="list-pagination-page">Seite {props.page} von {pageCount}</span>
      </div>
      <div className="list-pagination-controls">
        <Button aria-label="Erste Seite" className="list-pagination-button" disabled={props.page <= 1} onClick={() => props.onPageChange(1)} type="button" variant="secondary"><ChevronsLeft aria-hidden="true" /></Button>
        <Button aria-label="Vorherige Seite" className="list-pagination-button" disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)} type="button" variant="secondary"><ChevronLeft aria-hidden="true" /></Button>
        <Button aria-label="Nächste Seite" className="list-pagination-button" disabled={props.page >= pageCount} onClick={() => props.onPageChange(props.page + 1)} type="button" variant="secondary"><ChevronRight aria-hidden="true" /></Button>
        <Button aria-label="Letzte Seite" className="list-pagination-button" disabled={props.page >= pageCount} onClick={() => props.onPageChange(pageCount)} type="button" variant="secondary"><ChevronsRight aria-hidden="true" /></Button>
      </div>
    </nav>
  );
}
