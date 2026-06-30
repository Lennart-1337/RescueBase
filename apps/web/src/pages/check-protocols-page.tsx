import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toOptionalString, withPrunedSearch } from "../app/filter-utils";
import { toError } from "../app/formatters";
import {
  PageHeader,
  PageToolbar,
  Workspace,
  WorkspaceMain,
  WorkspaceRail,
} from "../components/page-layout";
import { ErrorPanel, LoadingPanel } from "../components/state-panels";
import { catalogQueries } from "../queries/catalog";
import { checkQueries } from "../queries/checks";
import { CheckProtocolDialog } from "./check-protocols/check-protocol-dialog";
import {
  CheckProtocolFilter,
  type CheckProtocolFilters,
} from "./check-protocols/check-protocol-filter";
import { CheckProtocolList } from "./check-protocols/check-protocol-list";
import { CheckProtocolPagination } from "./check-protocols/check-protocol-pagination";
import { CheckProtocolStatusPanel } from "./check-protocols/check-protocol-status-panel";

export function CheckProtocolsPage() {
  const [selectedId, setSelectedId] = useState("");
  const navigate = useNavigate({ from: "/admin/check-protocols" });
  const search = useSearch({ from: "/admin/check-protocols" });
  const page = search.page ?? 1;
  const filters: CheckProtocolFilters = {
    kitId: search.kitId ?? "",
    q: search.q ?? "",
    status: search.status ?? "",
  };
  const protocols = useQuery(checkQueries.protocols({ ...withPrunedSearch(filters), page: String(page) }));
  const kits = useQuery(catalogQueries.kits());
  const detail = useQuery(checkQueries.detail(selectedId, Boolean(selectedId)));

  function updateFilters(patch: Partial<CheckProtocolFilters>) {
    void navigate({
      replace: true,
      search: (current) =>
        withPrunedSearch({
          ...current,
          kitId: toOptionalString(patch.kitId ?? filters.kitId),
          page: undefined,
          q: toOptionalString(patch.q ?? filters.q),
          status: toOptionalString(patch.status ?? filters.status),
        }),
    });
  }

  if (protocols.isLoading || kits.isLoading)
    return <LoadingPanel label="Check-Protokolle werden geladen" />;
  if (protocols.isError || kits.isError || !protocols.data || !kits.data)
    return (
      <ErrorPanel
        error={toError(protocols.error ?? kits.error)}
        onRetry={() => void Promise.all([protocols.refetch(), kits.refetch()])}
      />
    );

  return (
    <>
      <PageHeader title="Check-Protokolle" />
      <PageToolbar label="Check-Protokolle filtern">
        <CheckProtocolFilter
          count={protocols.data.items.length}
          filters={filters}
          kits={kits.data}
          onChange={updateFilters}
          onReset={() => void navigate({ replace: true, search: {} })}
          totalCount={protocols.data.totalCount}
        />
      </PageToolbar>
      <Workspace>
        <WorkspaceMain label="Protokollübersicht">
          <CheckProtocolList
            onOpen={setSelectedId}
            protocols={protocols.data.items}
          />
          <CheckProtocolPagination
            onPageChange={(nextPage) =>
              void navigate({
                search: (current) =>
                  withPrunedSearch({
                    ...current,
                    page: nextPage > 1 ? nextPage : undefined,
                  }),
              })
            }
            page={protocols.data.page}
            pageSize={protocols.data.pageSize}
            total={protocols.data.total}
          />
        </WorkspaceMain>
        <WorkspaceRail label="Protokollstatus">
          <CheckProtocolStatusPanel
            protocols={protocols.data.items}
            total={protocols.data.total}
          />
        </WorkspaceRail>
      </Workspace>
      <CheckProtocolDialog
        detail={detail.data}
        isLoading={detail.isLoading}
        onClose={() => setSelectedId("")}
        open={Boolean(selectedId)}
      />
    </>
  );
}
