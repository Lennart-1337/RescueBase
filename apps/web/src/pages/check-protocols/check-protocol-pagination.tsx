import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui";
import "./check-protocol-pagination.css";

export function CheckProtocolPagination(props: { onPageChange: (page: number) => void; page: number; pageSize: number; total: number }) {
  const pageCount = Math.max(1, Math.ceil(props.total / props.pageSize));
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Protokollseiten" className="list-pagination">
      <Button disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)} type="button" variant="secondary"><ChevronLeft data-icon="inline-start" />Zurück</Button>
      <span>Seite {props.page} von {pageCount}</span>
      <Button disabled={props.page >= pageCount} onClick={() => props.onPageChange(props.page + 1)} type="button" variant="secondary">Weiter<ChevronRight data-icon="inline-end" /></Button>
    </nav>
  );
}
