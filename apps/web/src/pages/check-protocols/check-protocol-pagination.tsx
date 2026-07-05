import { ListPagination } from "../../components/list-pagination";

export function CheckProtocolPagination(props: { onPageChange: (page: number) => void; page: number; pageSize: number; total: number }) {
  return <ListPagination label="Protokollseiten" onPageChange={props.onPageChange} page={props.page} pageSize={props.pageSize} total={props.total} />;
}
